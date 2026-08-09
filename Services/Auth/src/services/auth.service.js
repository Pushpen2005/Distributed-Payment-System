import { Prisma } from "@prisma/client";
import userRepository from "../repositories/user.repository.js";
import ConflictError from "../errors/ConflictError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import NotFoundError from "../errors/NotFoundError.js";
import sessionRepository from "../repositories/session.repository.js";
const AuthService = {
  async register(userData) {
    const existingUser = await userRepository.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictError("User already exists");
    }

    const { password, ...userInfo } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await userRepository.createUser({
        ...userInfo,
        passwordHash: hashedPassword,
      });

      // Never expose password hash
      const { passwordHash, ...safeUser } = newUser;

      return safeUser;
    } catch (err) {
      // Handles race condition where another request
      // inserts the same email before this one.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictError("User with this email already exists");
      }

      throw err;
    }
  },

  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const ispasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!ispasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }
    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role
    });
    const refreshToken = generateRefreshToken({
      sub: user.id,
      sid: session.id
    });
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const decoded = verifyRefreshToken(refreshToken);

    const expiresAt = new Date(decoded.exp * 1000);
    await sessionRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashedRefreshToken,
      expiresAt
    });
    return {
      accessToken,
      refreshToken
    }
  },
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    // Never expose password hash
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
};

export default AuthService;