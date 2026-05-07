const { AppError } = require("../errors/app-error");
const Joi = require("joi");

function normalizeSchema(schema) {
  if (schema && typeof schema.validate === "function") {
    return schema;
  }

  if (!schema || typeof schema !== "object") {
    throw new AppError("Invalid request schema", 500);
  }

  return Joi.object({
    body: schema.body || Joi.object({}).default({}),
    query: schema.query || Joi.object({}).default({}),
    params: schema.params || Joi.object({}).default({}),
  });
}

function validateRequest(schema) {
  return (req, res, next) => {
    const normalizedSchema = normalizeSchema(schema);
    const { error, value } = normalizedSchema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      },
    );

    if (error) {
      return next(new AppError("Validation failed", 400, error.details));
    }

    req.body = value.body || {};
    req.query = value.query || {};
    req.params = value.params || {};

    return next();
  };
}

module.exports = { validateRequest };
