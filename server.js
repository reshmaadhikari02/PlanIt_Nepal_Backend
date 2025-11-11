const express = require("express");
const dotenv = require("dotenv");
const passport = require("passport");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 5000;
const connectDB = require('./config/dbConfig');
require('./config/passportConfig');
dotenv.config();

const routes = require('./routes/index');
const { handleStripeWebhook } = require('./controllers/paymentController'); 

const app = express();


const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

app.post('/api/payments/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

app.use(express.json());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:8080",
    process.env.PREVIEW_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(passport.initialize());
app.set("trust proxy", 1);

connectDB();

app.use('/api', routes);

if (isProduction) {
    app.listen(PORT, () => {
        console.log(`Production server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Server URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
        console.log(`MongoDB: Connected to production database`);
        console.log(`Security: Production mode enabled`);
    });
} else if (isDevelopment) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Development server running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Network access: http://0.0.0.0:${PORT}`);
        console.log(`Local access: http://localhost:${PORT}`);
        console.log(`Network access: http://192.168.1.73:${PORT}`);
        console.log(`Development features enabled`);
        console.log(`API Routes: http://localhost:${PORT}/api`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (environment not specified)`);
        console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
        console.log(`Tip: Set NODE_ENV=production or NODE_ENV=development`);
    });
}

