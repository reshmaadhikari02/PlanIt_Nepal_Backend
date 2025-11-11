const express = require("express");
const passport = require("passport");

const authController = require("../controllers/authController");
const {
  registerValidation,
  loginValidation,
} = require('../middleware/validators');

const {loginLimiter,registerLimiter, emailVerificationLimiter} = require("../utils/rateLimitters");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// AUTHENTICATION ROUTES (No auth required)
router.post('/signup', registerValidation, registerLimiter, authController.signup);
router.post('/login', loginLimiter, loginValidation, authController.login);
router.post('/admin-login', loginLimiter, loginValidation, authController.adminLogin);

// GOOGLE AUTH ROUTES (Specific routes)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate("google", {session:false}), authController.googleCallback);

// TOKEN ROUTES (No auth required)
router.post('/refresh-token', authController.refreshAccessToken);

// EMAIL VERIFICATION ROUTES (Specific routes before parameter routes)
router.post('/verify/mail',emailVerificationLimiter, authMiddleware, authorizeRoles("customer"), authController.sendVerificationMail);
router.patch('/verify/mail', authMiddleware, authorizeRoles("customer"), authController.verifyMail);

// USER VERIFICATION ROUTES (Authenticated routes)
router.get('/verify/user', authMiddleware, authController.verifyUser);

// LOGOUT ROUTE (Authenticated routes)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;