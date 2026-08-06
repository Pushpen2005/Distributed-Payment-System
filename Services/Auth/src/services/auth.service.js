import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import userRepository from "../repositories/user.repository.js";

const AuthService = {
  async register(userData) {
    const existingUser = await userRepository.findByEmail(userData.email);

    if (existingUser) {
      throw new Error("User already exists");
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
        throw new Error("User already exists");
      }

      throw err;
    }
  },
};

export default AuthService;