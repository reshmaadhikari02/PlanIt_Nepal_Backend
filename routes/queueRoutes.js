const express = require('express');
const router = express.Router();
const { emailQueue } = require('../utils/emailQueue');
const  authMiddleware  = require('../middleware/authMiddleware');
const  authorizeRoles  = require('../middleware/authorizeRoles');

// Get queue status (admin only)
router.get('/email-queue/status', authMiddleware, authorizeRoles('admin'), (req, res) => {
    const status = emailQueue.getStatus();
    res.json({
        success: true,
        data: status
    });
});

// Clear queue (admin only)
router.post('/email-queue/clear', authMiddleware, authorizeRoles('admin'), (req, res) => {
    emailQueue.clear();
    res.json({
        success: true,
        message: 'Email queue cleared'
    });
});

module.exports = router;