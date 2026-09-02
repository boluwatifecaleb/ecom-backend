export const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.details.map((detail) => detail.message),
        });
    }

    req.body = value;
    next();
};

export const validateParams = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
        abortEarly: false,
    });

    if (error) {
        return res.status(400).json({
            message: 'Invalid request parameters',
            errors: error.details.map((detail) => detail.message),
        });
    }

    req.params = value;
    next();
};