module.exports = {
    validate: (schema) => {
        return (req, res, next) => {
            // Bypass Joi validation
            req.body = req.body || {};
            next();
        };
    }
};