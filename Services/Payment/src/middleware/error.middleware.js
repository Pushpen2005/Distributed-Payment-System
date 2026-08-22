
const errorMiddleware = (err, req, res, next) => {
    console.error(err);

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            message: err.message,
            code: err.code,
        });
    }

    return res.status(500).json({
        message: "Internal Server Error",
        code: "INTERNAL_ERROR",
    });
};

export default errorMiddleware;