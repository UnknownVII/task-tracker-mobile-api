const Joi = require('@hapi/joi');

//OBJECT VALIDATION
const objectValidation = (data) => {
    const schema = Joi.object({
        first_name: Joi.string()
            .min(3)
            .required(),
        last_name: Joi.string()
            .min(3)
            .required(),
    });
    return schema.validate(data);
}

module.exports.objectValidation = objectValidation;