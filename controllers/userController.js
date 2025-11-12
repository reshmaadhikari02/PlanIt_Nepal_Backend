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
        // Enhanced logging
        console.log('Full request body:', JSON.stringify(req.body, null, 2));
        console.log('Email type:', typeof email);
        console.log('Email length:', email?.length);
        console.log('Email raw:', email);
        console.log('Email with quotes:', `"${email}"`);
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log('Current user email:', user.email);
        console.log('Current email type:', typeof user.email);
        console.log('Are emails equal?', email === user.email);
        console.log('Email comparison (strict):', JSON.stringify(email) === JSON.stringify(user.email));

        // Trim and normalize email
        const normalizedEmail = email?.trim().toLowerCase();
        const currentEmail = user.email?.trim().toLowerCase();
        
        console.log('Normalized new email:', normalizedEmail);
        console.log('Normalized current email:', currentEmail);
        console.log('Normalized emails equal?', normalizedEmail === currentEmail);

        if (email && normalizedEmail !== currentEmail) {
            console.log('Email is different, checking for duplicates...');
            
            const emailExists = await User.findOne({ 
                email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }, 
                _id: { $ne: userId } 
            });
            
            if (emailExists) {
                console.log('Email already exists:', emailExists.email);
                return res.status(400).json({ success: false, message: 'Email already in use by another account' });
            }
            
            console.log('Email is unique, updating...');
            user.email = normalizedEmail;
        } else {
            console.log('Email unchanged or not provided');
        }

        if (number && number !== user.number) {
            console.log('Number is different, checking for duplicates...');
            
            const numberExists = await User.findOne({ number, _id: { $ne: userId } });
            if (numberExists) {
                console.log('Number already exists:', numberExists.number);
                return res.status(400).json({ success: false, message: 'Number already in use by another account' });
            }
            
            console.log('Number is unique, updating...');
            user.number = number;
        }

        if (name && name.trim() !== user.name) {
            console.log('Updating name from', user.name, 'to', name.trim());
            user.name = name.trim();
        }

        console.log('Final user object before save:', {
            name: user.name,
            email: user.email,
            number: user.number
        });

        console.log('Saving user...');
        const savedUser = await user.save();
        console.log('User saved successfully. New email:', savedUser.email);

        const { password, refreshToken, resetPasswordToken, resetPasswordExpire, ...safeUser } = savedUser.toObject();
        
        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully', 
            user: safeUser 
        });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.code === 11000) {
            console.error('Duplicate key error:', error.keyPattern);
        }
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error: ' + error.message 
        });
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