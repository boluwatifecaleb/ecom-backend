import Joi from 'joi';

const objectId = Joi.string().hex().length(24).message('"{#label}" must be a valid ObjectId');

export const addToCartSchema = Joi.object({
    productId: objectId.required(),
    quantity: Joi.number().integer().min(1).default(1),
});

export const updateQuantitySchema = Joi.object({
    quantity: Joi.number().integer().min(1).required(),
});

export const productIdParamSchema = Joi.object({
    productId: objectId.required(),
});