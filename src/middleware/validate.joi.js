const ApiError = require("../utils/apiError");

const validate = (schema) => {
  return (req, res, next) => {
    const data = {
      ...req.body,
      ...req.params,
      ...req.query
    };

    const options = {
      abortEarly: false, // semua error ditampilkan
      allowUnknown: true, // field selain schema diabaikan
      stripUnknown: true, // remove field yang tidak ada di schema
    };

    const { error, value } = schema.validate(data, options);

    if (error) {
      const messages = error.details.map((d) => d.message).join(", ");
      return next(new ApiError(400, messages));
    }

    req.body = value; // hasil validasi disanitasi juga
    next();
  };
};

module.exports = { validate };
