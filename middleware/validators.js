const { body, param, validationResult } = require('express-validator');

// Centralized validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Registration validation
const registerValidation = [
  body('name')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .toLowerCase()
    .normalizeEmail(),
  body('number')
    .isMobilePhone().withMessage('Valid phone number is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  validate
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Profile update validation
const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email')
    .optional()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('number')
    .optional()
    .isMobilePhone().withMessage('Valid phone number is required'),
  validate
];

// Account delete validation
const accountDeleteValidation = [
  body('password')
    .notEmpty().withMessage('Password is required to delete account'),
  validate
];

// Change password validation
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required to change to the New password"),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  body("confirmNewPassword")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
  validate
];

// Forgot password validation
const forgotPasswordValidation = [
  param("token")
    .notEmpty().withMessage("Token is required to reset the Password"),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  body("confirmNewPassword")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  profileUpdateValidation,
  accountDeleteValidation,
  changePasswordValidation,
  forgotPasswordValidation
};