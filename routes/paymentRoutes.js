const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Start payment process
router.post('/start-payment', authMiddleware, authorizeRoles('customer'), paymentController.startPayment);

// Check payment status
router.get('/status/:sessionId', authMiddleware, authorizeRoles('customer'), paymentController.checkPaymentStatus);

module.exports = router;