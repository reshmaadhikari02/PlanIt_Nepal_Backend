const express = require("express");
const router = express.Router();

const contactRoutes = require('./contactRoutes');
const venueRoutes = require("./venueRoutes");
const cuisineRoutes = require("./cuisineRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require('./userRoutes');
const orderRoutes = require('./orderRoutes');
const reviewRoutes = require("./reviewRoutes");
const passwordRoutes = require("./passwordRoutes");
const studioRoutes = require("./studioRoutes");
const paymentRoutes = require("./paymentRoutes"); // Add payment routes
const queueRoutes = require('./queueRoutes');
const recommendRoutes = require('./recommendRoutes');
const{generalLimiter} = require("../utils/rateLimitters");

// Routes WITHOUT rate limiting (they have their own specific limiters)
router.use('/passwords', passwordRoutes);
router.use('/auths', authRoutes);

// Routes WITH general rate limiting
router.use('/contacts', generalLimiter, contactRoutes);
router.use('/venues', generalLimiter, venueRoutes);
router.use('/cuisines', generalLimiter, cuisineRoutes);
router.use('/users', generalLimiter, userRoutes);
router.use('/orders', generalLimiter, orderRoutes);
router.use('/reviews', generalLimiter, reviewRoutes);
router.use('/studios', generalLimiter, studioRoutes);
router.use('/payments', paymentRoutes); 
router.use('/recommend', generalLimiter, recommendRoutes);
router.use('/api/admin', queueRoutes);

module.exports = router;
