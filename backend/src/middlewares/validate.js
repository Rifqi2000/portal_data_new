function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: err.errors || err,
        },
      });
    }
  };
}

module.exports = { validate };
