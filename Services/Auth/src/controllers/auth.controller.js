import AuthService from "../services/auth.service.js";


const AuthController = {
  async register(req, res,next) {
        const userData = req.body;
        try{
            const newUser = await AuthService.register(userData);
            res.status(201).json({
                message: "User registered successfully",
                user: newUser
            });
        } catch(err){
            next(err);
        }
  }
};

export default AuthController;