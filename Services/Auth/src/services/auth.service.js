import userRepository from "../repositories/user.repository.js";
import bcrypt from "bcryptjs";
const AuthService = {
    async register(userData){
        const existingUser = await userRepository.findByEmail(userData.email);
        if(existingUser != null){
            throw new Error("user already exists");
        }
         const { password, ...userInfo } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userRepository.createUser({
      ...userInfo,
      passwordHash: hashedPassword,
    });
        return newUser;
    }
}


export default AuthService;