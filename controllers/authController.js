const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyToken
} = require('../utils/tokenHelpers');
const { queueVerificationOTP } = require('../utils/emailQueue');

require("dotenv").config();
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) {
  throw new Error("Refresh Token is not defined in the environment variable");
}

exports.signup = async (req, res) => {
  const { name, email, number, password, confirmPassword } = req.body;
  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }
    const phoneExists = await User.findOne({ number });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number is already used"
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      number,
      password: hashedPassword,
      role: 'customer'
    });
    await newUser.save();
    res.status(201).json({
      success: true,
      message: "Your account is registered successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed attempts. Try again in ${timeLeft} minutes.`
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60000);
        await user.save();
        return res.status(423).json({
          success: false,
          message: 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        });
      }
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    const refreshToken = generateRefreshToken(user);
    const accessToken = generateAccessToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({
      success: true,
      message: "Logged In SuccessFully",
      accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    if (user.role != "admin") {
      return res.status(401).json({
        success: false,
        message: "You Are Not Authorized to Access"
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Credentials"
      });
    }
    const accessToken = generateAccessToken(user);
    return res.status(200).json({
      success: true,
      message: "Welcome To the Dashboard",
      accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.verifyUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (user.role === "admin") {
      return res.status(200).json({
        success: true,
        valid: true,
        user: req.user
      });
    } else {
      return res.status(403).json({
        success: false,
        valid: false,
        message: "You are not authorized"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({ message: "Authentication failed" });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshTokenCookie(res, refreshToken);
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?accessToken=${accessToken}`);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendVerificationMail = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const OTP_CODE = crypto.randomInt(100000, 1000000);
    user.OTP = OTP_CODE;
    user.OTPexpiry = Date.now() + 3600000;
    await user.save();
    try {
      queueVerificationOTP(user.email, user.name, OTP_CODE);
      return res.status(200).json({
        success: true,
        message: 'Verification email queued successfully'
      });
    } catch (emailError) {
      user.OTP = undefined;
      user.OTPexpiry = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Failed to queue verification email. Please try again.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.verifyMail = async (req, res) => {
  const { otp } = req.body;
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (user.OTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
    if (user.OTPexpiry < Date.now()) {
      user.OTP = null;
      user.OTPexpiry = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }
    user.verified = true;
    user.OTP = null;
    user.OTPexpiry = null;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing'
      });
    }
    let payload;
    try {
      payload = verifyToken(refreshToken, refreshTokenSecret);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findById(payload.id).lean();
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token not valid for user'
      });
    }
    const accessToken = generateAccessToken(user);
    res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};



