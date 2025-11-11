const bcrypt = require(`bcryptjs`);
const User = require(`../models/User`);
const crypto = require(`crypto`);
const { queuePasswordResetEmail } = require('../utils/emailQueue');
require(`dotenv`).config();

exports.changePassword = async (req,res) => {
    const { currentPassword, newPassword} = req.body;
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success:false,
                message: "User not found" 
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success:false,
                message: "Current password is incorrect" 
            });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ 
            success:true,
            message: "Password updated successfully" 
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: "Server Error" 
        });
    }
}

exports.mailPasswordResetToken = async (req,res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                success:false,
                message: "User not found" 
            });
        }
        
        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 3600000;

        await user.save();

        try {
            const jobId = queuePasswordResetEmail(email, resetToken);
            
            return res.status(200).json({
                success: true,
                message: `Password reset email queued successfully`
            });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                message: `Failed to queue email. Please try again.`
            });
        }
    }
    catch (error) {
        return res.status(500).json({ 
            success:false,
            message: `Server Error` 
        });
    }
}

exports.forgotPassword = async (req,res) => {
    const { token } = req.params;
    const { newPassword} = req.body;
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success:false,
                message: "Invalid or expired token" 
            });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(newPassword, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        return res.status(200).json({ 
            success:true,
            message: "Password reset successfully" 
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: "Server Error" 
        });
    }
}
