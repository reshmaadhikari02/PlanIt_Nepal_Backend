const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const {changePasswordValidation,
    forgotPasswordValidation
} = require("../middleware/validators");
const {forgotPasswordLimiter} = require('../utils/rateLimitters');

const passwordControlller = require("../controllers/passwordController");

const router = express.Router();

// Password reset request (initiate forgot password)
router.post('/forgot', forgotPasswordLimiter, passwordControlller.mailPasswordResetToken);

// Password reset with token (complete forgot password)
router.patch('/forgot/:token', forgotPasswordValidation, passwordControlller.forgotPassword);

// Change password (authenticated user)
router.patch('/change', authMiddleware, authorizeRoles("customer"), changePasswordValidation, passwordControlller.changePassword);

module.exports = router;