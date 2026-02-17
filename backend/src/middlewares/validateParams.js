function requireUuidParam(paramName) {
  return (req, res, next) => {
    const v = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(String(v || ""))) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_FORMAT", message: `${paramName} must be a UUID` },
      });
    }
    next();
  };
}

module.exports = { requireUuidParam };
