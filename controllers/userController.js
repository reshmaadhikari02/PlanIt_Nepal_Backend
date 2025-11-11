const User = require("../models/User");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinaryConfig");
const bcrypt = require("bcryptjs");

exports.getProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId)
            .lean()
            .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire -failedLoginAttempts -OTP -OTPexpiry -profileImageId');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, message: 'User fetched successfully', user });
    } catch {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.updateProfile = async (req, res) => {
    const { name, email, number } = req.body;
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already in use by another account' });
            }
            user.email = email;
        }
        if (number && number !== user.number) {
            const numberExists = await User.findOne({ number, _id: { $ne: userId } });
            if (numberExists) {
                return res.status(400).json({ success: false, message: 'Number already in use by another account' });
            }
            user.number = number;
        }
        if (name) user.name = name;
        await user.save();
        const { password, refreshToken, resetPasswordToken, resetPasswordExpire, ...safeUser } = user.toObject();
        res.status(200).json({ success: true, message: 'Profile updated successfully', user: safeUser });
    } catch {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } })
            .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
            .lean();
        res.status(200).json({ success: true, message: 'Users fetched successfully', users });
    } catch {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.deleteUserAccount = async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.role === "admin") {
            return res.status(401).json({ success: false, message: "You cannot perform this route" });
        }
        if (user.profileImageId) {
            try { await deleteFromCloudinary(user.profileImageId); } catch {}
        }
        await User.findByIdAndDelete(userId);
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.uploadProfilePic = async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an image" });
        }
        if (user.profileImageId) {
            try { await deleteFromCloudinary(user.profileImageId); } catch {}
        }
        let result;
        try {
            result = await uploadToCloudinary(req.file.buffer);
        } catch {
            return res.status(500).json({ success: false, message: "Failed to upload image. Please try again." });
        }
        user.profileImage = result.secure_url;
        user.profileImageId = result.public_id;
        await user.save();
        return res.status(200).json({ success: true, message: "Profile picture updated successfully", image: result.secure_url });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.deleteOwnAccount = async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
        if (user.profileImageId) {
            try { await deleteFromCloudinary(user.profileImageId); } catch {}
        }
        await User.findByIdAndDelete(userId);
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getUserForAdminInspection = async (req, res) => {
    const { userId } = req.params;
    const adminId = req.user.id;
    try {
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }
        const user = await User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const userInspectionData = {
            basicInfo: {
                id: user._id,
                name: user.name,
                email: user.email,
                number: user.number,
                role: user.role,
                verified: user.verified,
                profileImage: user.profileImage
            },
            accountStatus: {
                isVerified: user.verified,
                failedLoginAttempts: user.failedLoginAttempts || 0,
                isLocked: user.lockUntil ? user.lockUntil > Date.now() : false,
                lockUntil: user.lockUntil || null,
                hasRefreshToken: !!user.refreshToken,
                hasResetToken: !!user.resetPasswordToken,
                resetTokenExpiry: user.resetPasswordExpire || null
            },
            otpInfo: {
                hasActiveOTP: !!user.OTP,
                otpExpiry: user.OTPexpiry || null,
                isOTPExpired: user.OTPexpiry ? user.OTPexpiry < Date.now() : null
            },
            timestamps: {
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            securityInfo: {
                hasPassword: !!user.password,
                profileImageId: user.profileImageId || null,
                lastPasswordReset: user.resetPasswordExpire || null
            }
        };
        res.status(200).json({
            success: true,
            message: `User inspection data retrieved successfully for ${user.name}`,
            data: {
                user: userInspectionData,
                inspectedBy: {
                    adminId: adminId,
                    adminName: admin.name,
                    inspectionTime: new Date()
                }
            }
        });
    } catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};