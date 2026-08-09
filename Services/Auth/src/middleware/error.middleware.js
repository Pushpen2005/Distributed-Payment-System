import AppError from "../errors/AppError.js";
const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default errorMiddleware;