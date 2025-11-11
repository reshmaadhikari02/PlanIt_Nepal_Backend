const express = require('express');
const recommendController = require('../controllers/recommendController');
const { generalLimiter } = require('../utils/rateLimitters');

const router = express.Router();

router.get('/wedding-package', generalLimiter, recommendController.getWeddingPackageRecommendation);

module.exports = router;