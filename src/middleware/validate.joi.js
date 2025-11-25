const ApiError = require("../utils/apiError");

// Parsing JSON untuk multipart
function autoParseJson(body) {
  if (!body) return body;
  const parsed = { ...body };

  for (const key of Object.keys(parsed)) {
    const value = parsed[key];
    if (typeof value !== "string") continue;

    const t = value.trim();
    if (!(t.startsWith("{") && t.endsWith("}")) && !(t.startsWith("[") && t.endsWith("]")))
      continue;

    try {
      parsed[key] = JSON.parse(t);
    } catch (e) {}
  }

  return parsed;
}

const validate = (schema) => {
  return (req, res, next) => {

    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      req.body = autoParseJson(req.body);
    }

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    try {
      // Validate Body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, options);
        if (error) throw error;
        req.body = value;
      }
      // Validate Params
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, options);
        if (error) throw error;
        req.params = value;
      }
      // Validate Query
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, options);
        if (error) throw error;
        req.query = value;
      }
      next();
    } catch (err) {
      const messages = err.details.map((d) => d.message).join(", ");
      return next(new ApiError(400, messages));
    }
  };
};

module.exports = { validate };
