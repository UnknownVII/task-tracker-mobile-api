const Joi = require("@hapi/joi");

//REGISTER VALIDATION
const registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(6).required(),
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
  });
  return schema.validate(data);
};

//LOGIN VALIDATION
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
  });
  return schema.validate(data);
};

//OBJECT VALIDATION
const objectValidation = (data) => {
  const schema = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    age: Joi.string().required(),
    course: Joi.string().required(),
    year_level: Joi.string().required(),
    subjects: Joi.array().items(Joi.string().min(3)).required(),
  });
  return schema.validate(data);
};

module.exports.objectValidation = objectValidation;
module.exports.loginValidation = loginValidation;
module.exports.registerValidation = registerValidation;
