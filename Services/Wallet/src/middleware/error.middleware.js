import AppError from "../../../../shared/errors/AppError.js";

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack || err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code || "INTERNAL_ERROR",
    });
  }

  return res.status(500).json({
    message: "Internal Server Error",
    code: "INTERNAL_ERROR",
  });
};

export default errorMiddleware;