const ApiError = require("../utils/apiError");


const normalizeEmptyString = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
};

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
    } catch (e) { }
  }

  return parsed;
}

const validate = (schema) => {
  return (req, res, next) => {

    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      req.body = autoParseJson(req.body);
    }
    // khusus sertif ada validasi minimal link_sertifikat atau file_sertifikat harus ada
    if ('link_sertifikat' in req.body) {
      req.body.link_sertifikat = normalizeEmptyString(
        req.body.link_sertifikat
      );
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

      if ('link_sertifikat' in req.body) {
        req.body.link_sertifikat = normalizeEmptyString(
          req.body.link_sertifikat
        );
        // validasi khusus sementara untuk sertif
        const hasLink =
          typeof req.body.link_sertifikat === 'string' &&
          req.body.link_sertifikat.trim().length >= 3;

        const hasFile = !!req.file;

        if (!hasLink && !hasFile) {
          return next(
            new ApiError(
              422,
              'Minimal salah satu harus diisi: link sertifikat atau file sertifikat'
            )
          );
        }

      }

      next();
    } catch (err) {
      const messages = err.details.map((d) => d.message).join(", ");
      return next(new ApiError(400, messages));
    }
  };
};

module.exports = { validate };
