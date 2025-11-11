const express = require('express');
const authMiddleware = require('../middleware/authMiddleware')
const authorizeRoles = require('../middleware/authorizeRoles');
const {profileUpdateValidation
    ,accountDeleteValidation
} = require("../middleware/validators");
const upload = require('../middleware/multer');

const userController = require('../controllers/userController');

const router = express.Router();

// Get all users (admin only)
router.get('/', authMiddleware, authorizeRoles("admin"), userController.getAllUsers);

// Get current user profile (specific route - must come before parameter routes)
router.get('/me', authMiddleware, authorizeRoles("customer"), userController.getProfile);

// Update current user profile (specific route - must come before parameter routes)
router.patch('/me', authMiddleware, authorizeRoles("customer"), profileUpdateValidation, userController.updateProfile);

// Upload profile picture (specific route - must come before parameter routes)
router.patch('/me/picture', authMiddleware, authorizeRoles('customer'), upload.single('image'), userController.uploadProfilePic);

// Delete own account (specific route - must come before parameter routes)
router.delete('/me', authMiddleware, authorizeRoles("customer"), accountDeleteValidation, userController.deleteOwnAccount);

// Delete user account by ID (parameter route - must come after specific routes)
router.delete('/:userId', authMiddleware, authorizeRoles('admin'), userController.deleteUserAccount);

// Add these routes to your userRoutes.js
router.get('/inspect/:userId', authMiddleware, authorizeRoles("admin"), userController.getUserForAdminInspection);

module.exports = router;