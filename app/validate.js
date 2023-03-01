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
    title: Joi.string().min(3).max(20).required(),
    description: Joi.string().min(3).max(250).required(),
    due_date: Joi.date().required(),
    start_time: Joi.string(),
    end_time: Joi.string(),
    prioritize: Joi.boolean(),
    completed: Joi.boolean(),
    date_finished: Joi.date(),
    time_finished: Joi.date(),
    date_created: Joi.date(),
  });
  return schema.validate(data);
};

module.exports.taskValidation = taskValidation;
module.exports.loginValidation = loginValidation;
module.exports.registerValidation = registerValidation;
