import AuthService from "../services/auth.service.js";

const AuthController = {
    async register(req, res, next) {
        const userData = req.body;
        try {
            const newUser = await AuthService.register(userData);
            res.status(201).json({
                message: "User registered successfully",
                user: newUser
            });
        } catch (err) {
            next(err);
        }
    },
    async login(req, res, next) {
        const { email, password } = req.body;
        try {
            const result = await AuthService.login(email, password);
            res.cookie("accessToken", result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 15 * 60 * 1000, // 15 minutes (match JWT expiry)
            });

            res.status(200).json({
                message: result.message,
            });

        }
        catch (err) {
            next(err);
        }
    }  ,
    async getUser(req, res, next) {
        const userId = req.user.sub;
        try{
            const user = await AuthService.getUserById(userId);
            res.status(200).json({
                message: "User fetched successfully",
                user: user
            });
        }
        catch (err) {
            next(err);
        }
    }
};

    export default AuthController;