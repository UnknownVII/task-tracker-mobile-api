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
const taskValidation = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(20),
    description: Joi.string().min(3).max(250),
    due_date: Joi.date(),
    start_time: Joi.string().allow(null).allow(""),
    end_time: Joi.string().allow(null).allow(""),
    prioritize: Joi.boolean(),
    status: Joi.string(),
    date_time_finished: Joi.date().allow(null).allow(""),
    date_created: Joi.date(),
  });
  return schema.validate(data);
};

module.exports.taskValidation = taskValidation;
module.exports.loginValidation = loginValidation;
module.exports.registerValidation = registerValidation;
