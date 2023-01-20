const Joi = require("@hapi/joi");

//OBJECT VALIDATION
const objectValidation = (data) => {
  const schema = Joi.object({
    text: Joi.string().required(),
    day: Joi.string().required(),
    reminder: Joi.bool(),
  });
  return schema.validate(data);
};

module.exports.objectValidation = objectValidation;
