const stripe = require('stripe');
require('dotenv').config();

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripeClient;