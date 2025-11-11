
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    number: {
        type: Number,
        unique: true,
    },
    password: {
        type: String,
    },
    role: {
        type: String,
        required: true
    },
    verified:{
        type:Boolean,
        default:false
    },
    OTP:{
        type:String,
        default:null
    },
    OTPexpiry:{
        type:Date,
        default:null
    },
    refreshToken: {
        type: String,
        default: null
    },
    profileImage: {
        type: String,
        default: "https://res.cloudinary.com/de1lvlqme/image/upload/v1749566197/vecteezy_default-profile-account-unknown-icon-black-silhouette_20765399_ldtak0.jpg"
    },
    profileImageId: {
        type: String,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpire: {
        type: Date,
        default: null
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

