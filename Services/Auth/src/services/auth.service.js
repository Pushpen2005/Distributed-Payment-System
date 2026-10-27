import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import userRepository from "../repositories/user.repository.js";
import sessionRepository from "../repositories/session.repository.js";
import ConflictError from "../../../../shared/errors/ConflictError.js";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";
import NotFoundError from "../../../../shared/errors/NotFoundError.js";
import cachedOTP from "../cache/otp.cache.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const MAX_OTP_ATTEMPTS = 5;

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

    // Temporary login challenge
    const challengeId = crypto.randomUUID();

    const otp = crypto
      .randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

    await cachedOTP.create(challengeId, {
      userId: user.id,
      otp,
    });
    return {
      challengeId,
      otp, // temporary for local testing only
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
      if (!refreshToken) {
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

  async createAuthenticatedSession(user) {
    const sessionId = crypto.randomUUID();

    const refreshToken = generateRefreshToken({
      sub: user.id,
      sid: sessionId,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const decoded = verifyRefreshToken(refreshToken);

    await sessionRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(decoded.exp * 1000),
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
    };
  },

  async logout(refreshToken) {
    try {
      if (!refreshToken) {
        throw new UnauthorizedError("Refresh token is required.");
      }
      const payload = verifyRefreshToken(refreshToken);
      const { sid } = payload;

      const session = await sessionRepository.findById(sid);
      if (!session) {
        throw new UnauthorizedError("Invalid refresh token.");
      }
      if (session.revokedAt) {
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
  async verifyOTP(challengeId, otp) {
    if (
  typeof challengeId !== "string" ||
  !challengeId ||
  typeof otp !== "string" ||
  !/^\d{6}$/.test(otp)
) {
  throw new UnauthorizedError(
    "OTP has expired or is invalid."
  );
}
    const challenge = await cachedOTP.get(challengeId);

    if (!challenge) {
      throw new UnauthorizedError("OTP has expired or is invalid.");
    }

    if (challenge.otp !== otp) {
      const attempts = await cachedOTP.incrementAttempts(challengeId);
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await cachedOTP.delete(challengeId);
        throw new UnauthorizedError(
          "Maximum OTP attempts exceeded."
        );
      }
      throw new UnauthorizedError("Invalid OTP.");
    }

    // OTP is single-use
    await cachedOTP.delete(challengeId);

    const user = await userRepository.findById(challenge.userId);

    if (!user) {
      throw new UnauthorizedError("User not found.");
    }

    return AuthService.createAuthenticatedSession(user);
  },
  async sendOTP(userId) {
    const otp = crypto
      .randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

    await cachedOTP.create(userId, otp);

    return otp;
  }
};

export default AuthService;