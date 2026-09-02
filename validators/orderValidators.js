import Joi from 'joi';

const objectId = Joi.string().hex().length(24).message('"{#label}" must be a valid ObjectId');

export const orderIdParamSchema = Joi.object({
    orderId: objectId.required(),
});

export const referenceParamSchema = Joi.object({
    reference: Joi.string().trim().min(1).required(),
});