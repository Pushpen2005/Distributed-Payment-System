import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import userRepository from "../repositories/user.repository.js";
import sessionRepository from "../repositories/session.repository.js";

import ConflictError from "../errors/ConflictError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import NotFoundError from "../errors/NotFoundError.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const AuthService = {
  async register(userData) {
    const existingUser = await userRepository.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictError("User already exists");
    }

    const { password, ...userInfo } = userData;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const newUser = await userRepository.createUser({
        ...userInfo,
        passwordHash,
      });

      const { passwordHash: _, ...safeUser } = newUser;
      return safeUser;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictError("User already exists");
      }

      throw err;
    }
  },

  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Create session first
    const session = await sessionRepository.createSession({
      userId: user.id,
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      sub: user.id,
      sid: session.id,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const decoded = verifyRefreshToken(refreshToken);

    await sessionRepository.update(session.id, {
      refreshTokenHash,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return {
      accessToken,
      refreshToken,
    };
  },

  async getUserById(id) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },

  async refresh(refreshToken) {
    try {
      if(!refreshToken){
        throw new UnauthorizedError("Refresh token is required.");
      }
      const payload = verifyRefreshToken(refreshToken);

      const { sid, sub } = payload;

      const session = await sessionRepository.findById(sid);

      if (!session) {
        throw new UnauthorizedError("Invalid refresh token.");
      }

      if (session.revokedAt) {
        throw new UnauthorizedError("Session has been revoked.");
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedError("Session has expired.");
      }

      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash
      );

      if (!isMatch) {
        await sessionRepository.revokeSession(session.id);

        throw new UnauthorizedError(
          "Refresh token reuse detected. Please login again."
        );
      }

      const user = await userRepository.findById(sub);

      if (!user) {
        throw new UnauthorizedError("User not found.");
      }

      const accessToken = generateAccessToken({
        sub: user.id,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken({
        sub: user.id,
        sid: session.id,
      });

      const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

      const decoded = verifyRefreshToken(newRefreshToken);

      await sessionRepository.updateSession(session.id, {
        refreshTokenHash,
        expiresAt: new Date(decoded.exp * 1000),
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired refresh token.");
    }
  },
  async logout(refreshToken) {
    try{
      if(!refreshToken){
      throw new UnauthorizedError("Refresh token is required.");
    }
    const payload = verifyRefreshToken(refreshToken);
    const { sid } = payload;

    const session = await sessionRepository.findById(sid);
    if(!session){
      throw new UnauthorizedError("Invalid refresh token.");
    }
    if(session.revokedAt){
      return; // Session already revoked, no action needed
    }
    await sessionRepository.revokeSession(session.id);
  }
  catch (err) {
    if (err instanceof UnauthorizedError) {
        throw err;
    }
    throw err;
}
},
};

export default AuthService;