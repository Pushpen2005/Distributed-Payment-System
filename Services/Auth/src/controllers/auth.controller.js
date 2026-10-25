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

    res.status(200).json({
      message: "OTP verification required",
      challengeId: result.challengeId,
      otp: result.otp, // REMOVE before production
    });
  } catch (err) {
    next(err);
  }
},
    async getUser(req, res, next) {
        const userId = req.user.sub;
        try {
            const user = await AuthService.getUserById(userId);
            res.status(200).json({
                message: "User fetched successfully",
                user: user
            });
        }
        catch (err) {
            next(err);
        }
    },
    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies.refreshToken;

            const { accessToken, refreshToken: newRefreshToken } =
                await AuthService.refresh(refreshToken);

            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 15 * 60 * 1000, // 15 minutes
            });

            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            res.status(200).json({
                message: "Token refreshed successfully"
            });

        } catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        const refreshToken = req.cookies.refreshToken;
        try {
            await AuthService.logout(refreshToken);
            res.clearCookie("accessToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });

            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });
            res.status(200).json({
                message: "Logout successful"
            });
        }
        catch (err) {
            next(err);
        }
    },
    async verifyOTP(req, res, next) {
        const { userId, otp } = req.body;
        try {
            const isValid = await AuthService.verifyOTP(userId, otp);
            res.status(200).json({
                message: "OTP verified successfully",
                isValid: isValid
            });
        } catch (err) {
            next(err);
        }   
    },
    async sendOTP(req, res, next) {
        const { userId } = req.body;
        try {
            const otp = await AuthService.sendOTP(userId);
            res.status(200).json({
                message: "OTP sent successfully",
                otp: otp // In a real application, you wouldn't send the OTP back in the response.
            });
        } catch (err) {
            next(err);
        }
    },
};

export default AuthController;