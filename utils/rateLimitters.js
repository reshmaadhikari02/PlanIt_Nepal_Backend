const rateLimit = require("express-rate-limit");

// Contact form limiter - Strict to prevent spam
const contactFormLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many contact form submissions from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Login limiter - Very strict for security
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
});

// Register limiter - Moderately strict
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many registration attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// Password reset limiter - Very strict for security
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: "Too many password reset requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// General API limiter - Balanced for normal usage
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// File upload limiter - Strict for uploads
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many file uploads from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Email verification limiter - Prevent email spam
const emailVerificationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3, 
    message: {
        success: false,
        message: 'Too many verification email requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Search/read operations limiter - More lenient for browsing
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 4000,
    message: {
        success: false,
        message: 'Too many search requests from this IP, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

module.exports = {
    contactFormLimiter,
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    generalLimiter,
    uploadLimiter,
    emailVerificationLimiter,
    readLimiter
};
