
/**
 * Senior Backend Engineer: Production-level Dynamic Form Validator
 * Validates candidate responses against a Drive's formSchema.
 */

const validateResponses = (schema, responses) => {
    const errors = [];

    if (!schema || !Array.isArray(schema)) return errors;

    schema.forEach(field => {
        const { fieldId, label, type, required, options, validation } = field;
        const value = responses[fieldId];

        // 1. Required Check
        if (required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
            errors.push({
                fieldId,
                msg: `${label} is required`
            });
            return; // Skip other checks if missing and required
        }

        // Skip other checks if value is empty and not required
        if (value === undefined || value === null || value === '') return;

        // 2. Type-specific Validation
        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    errors.push({ fieldId, msg: `Please provide a valid email for ${label}` });
                }
                break;
            
            case 'phone':
                const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic E.164
                if (!phoneRegex.test(value)) {
                    errors.push({ fieldId, msg: `Please provide a valid contact number for ${label}` });
                }
                break;

            case 'number':
                if (typeof value !== 'number' && isNaN(Number(value))) {
                    errors.push({ fieldId, msg: `${label} must be a number` });
                } else if (validation) {
                    const num = Number(value);
                    if (validation.min !== undefined && num < validation.min) {
                        errors.push({ fieldId, msg: `${label} must be at least ${validation.min}` });
                    }
                    if (validation.max !== undefined && num > validation.max) {
                        errors.push({ fieldId, msg: `${label} cannot exceed ${validation.max}` });
                    }
                }
                break;

            case 'select':
                if (options && options.length > 0 && !options.includes(value)) {
                    errors.push({ fieldId, msg: `Invalid option selected for ${label}` });
                }
                break;

            case 'multi-select':
                if (!Array.isArray(value)) {
                    errors.push({ fieldId, msg: `${label} must be a list of options` });
                } else if (options && options.length > 0) {
                    const invalidOptions = value.filter(val => !options.includes(val));
                    if (invalidOptions.length > 0) {
                        errors.push({ fieldId, msg: `Invalid options selected for ${label}: ${invalidOptions.join(', ')}` });
                    }
                }
                break;

            case 'url':
                try {
                    new URL(value);
                } catch (_) {
                    errors.push({ fieldId, msg: `Please provide a valid URL for ${label}` });
                }
                break;
            
            case 'text':
            case 'textarea':
                if (validation) {
                    if (validation.min !== undefined && value.length < validation.min) {
                        errors.push({ fieldId, msg: `${label} must be at least ${validation.min} characters` });
                    }
                    if (validation.max !== undefined && value.length > validation.max) {
                        errors.push({ fieldId, msg: `${label} cannot exceed ${validation.max} characters` });
                    }
                }
                break;
        }
    });

    return errors;
};

module.exports = { validateResponses };
