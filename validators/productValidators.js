import Joi from 'joi';

const objectId = Joi.string().hex().length(24).message('"{#label}" must be a valid ObjectId');

export const createProductSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    price: Joi.number().min(0).required(),
    stock: Joi.number().integer().min(0).default(0),
    category: objectId.required(),
    sku: Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z0-9-]{3,20}$/)
        .required()
        .messages({
            'string.pattern.base': 'sku must be 3-20 characters, using only letters, numbers, and hyphens',
        }),
});

export const updateProductSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().trim().max(1000).allow(''),
    price: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category: objectId,
    sku: Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z0-9-]{3,20}$/)
        .messages({
            'string.pattern.base': 'sku must be 3-20 characters, using only letters, numbers, and hyphens',
        }),
}).min(1); // at least one field required for an update