const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

// Create review
router.post('/', authMiddleware, authorizeRoles("customer"), reviewController.postReviews);

// Get all reviews (admin only)
router.get('/', authMiddleware, authorizeRoles("admin"), reviewController.getAllReviews);

// Get verified reviews (specific route - must come before parameter routes)
router.get('/verified', reviewController.getVerifiedReviews);

// Get unverified reviews (specific route - must come before parameter routes)
router.get('/un-verified', authMiddleware, authorizeRoles("customer"), reviewController.getUnverifiedReviews);

// Toggle review verification status (parameter route)
router.patch('/:reviewId/verified', authMiddleware, authorizeRoles("admin"), reviewController.toggleVerified);

// Delete review (parameter route)
router.delete('/:reviewId', authMiddleware, authorizeRoles("admin"), reviewController.deleteReview);

module.exports = router;