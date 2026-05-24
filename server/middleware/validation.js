const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        console.error('Validation errors:', JSON.stringify(errorArray, null, 2));
        return res.status(400).json({
            msg: errorArray[0]?.msg || 'Validation failed',
            errors: errorArray
        });
    }
    next();
};

// Admin invite validation
const validateAdminInvite = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .customSanitizer(value => value ? value.toLowerCase().trim() : value),
    handleValidationErrors
];

// Admin registration validation
const validateAdminRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .customSanitizer(value => value ? value.toLowerCase().trim() : value),
    
    body('password')
        .isLength({ min: 5 })
        .withMessage('Password must be at least 5 characters long'),
    
    handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .customSanitizer(value => value ? value.toLowerCase().trim() : value),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

// Drive creation validation
const validateDriveCreation = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters'),
    
    body('company')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Company name must be between 2 and 50 characters'),
    
    body('description')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Description must be between 10 and 500 characters'),
    
    handleValidationErrors
];

// Candidate registration validation
const validateCandidateRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('contact')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Contact must be a string'),
    
    body('university')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('University name must be between 2 and 100 characters'),
    
    body('semester')
        .optional({ values: 'falsy' })
        .isInt({ min: 1, max: 12 })
        .withMessage('Semester must be between 1 and 12'),
    
    body('cgpa')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0, max: 100 })
        .withMessage('CGPA/Percentage must be between 0 and 100'),
    
    body('academicPerformance')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0, max: 100 })
        .withMessage('Academic performance must be between 0 and 100'),
    
    // Lateral Hiring Fields (Optional in validator, controlled by logic/UI)
    body('workExperience')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Work experience must be a positive number'),
    
    body('currentCompany')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),
    
    body('currentRole')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Role name must be between 2 and 100 characters'),
    
    body('noticePeriod')
        .optional({ values: 'falsy' })
        .trim(),
    
    body('currentCTC')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Current CTC must be a positive number'),
    
    body('expectedCTC')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Expected CTC must be a positive number'),
    
    body('driveId')
        .notEmpty()
        .withMessage('Drive ID is required'),
    
    handleValidationErrors
];

// Question upload validation
const validateQuestionUpload = [
    body('questions').isArray({ min: 1 })
        .withMessage('At least one question is required'),
    
    body('questions.*.question')
        .trim()
        .isLength({ min: 5, max: 1000 })
        .withMessage('Question must be between 5 and 1000 characters'),
    
    body('questions.*.options')
        .isArray({ min: 2, max: 6 })
        .withMessage('Each question must have between 2 and 6 options'),
    
    body('questions.*.options.*')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Each option must be between 1 and 200 characters'),
    
    body('questions.*.correctAnswer')
        .isInt({ min: 0 })
        .withMessage('Correct answer must be a valid option index'),
    
    handleValidationErrors
];

module.exports = {
    validateAdminRegistration,
    validateAdminLogin,
    validateAdminInvite,
    validateDriveCreation,
    validateCandidateRegistration,
    validateQuestionUpload,
    handleValidationErrors
};
