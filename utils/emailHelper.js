const nodemailer = require('nodemailer');
const { google } = require('googleapis');
require(`dotenv`).config();

let cachedAccessToken = null;
let tokenExpiry = null;
let cachedTransporter = null;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; 
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

const getAccessToken = async () => {
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    try {
        const accessTokenObj = await oAuth2Client.getAccessToken();
        if (!accessTokenObj || !accessTokenObj.token) {
            throw new Error("Failed to get access token");
        }
        
        cachedAccessToken = accessTokenObj.token;
        tokenExpiry = Date.now() + (50 * 60 * 1000);
        
        return cachedAccessToken;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
};

const createTransporter = async () => {
    try {
        if (cachedTransporter && cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedTransporter;
        }

        const accessToken = await getAccessToken();
        
        cachedTransporter = nodemailer.createTransport({
            service: `gmail`,
            auth: {
              type: 'OAuth2',
              user: process.env.USER_EMAIL,
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
              accessToken: accessToken
            },
            pool: true, 
            maxConnections: 5, 
            maxMessages: 100, 
            rateDelta: 1000, 
            rateLimit: 5 
        });
        
        return cachedTransporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        throw error;
    }
};

const generateOrderEmailTemplate = (order, user, paymentAmountType) => {
    let paymentStatusText, paymentSectionColor, paymentIcon;
    
    switch(paymentAmountType) {
        case 'full_payment':
            paymentStatusText = 'Full Payment Completed';
            paymentSectionColor = '#28a745';
            paymentIcon = '✅';
            break;
        case '25_percent':
            paymentStatusText = 'Advance Payment (25%) Completed';
            paymentSectionColor = '#ffc107';
            paymentIcon = '💳';
            break;
        case 'cash_payment':
            paymentStatusText = 'Cash Payment After Service';
            paymentSectionColor = '#17a2b8';
            paymentIcon = '💵';
            break;
        default:
            paymentStatusText = 'Advance Payment (25%) Completed';
            paymentSectionColor = '#ffc107';
            paymentIcon = '💳';
    }
    
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let itemsHtml = '';
    order.items.forEach(item => {
        const bookingDatesHtml = item.bookingDates && item.bookingDates.length > 0 
            ? `<br><small style="color: #666;">Booking Dates: ${item.bookingDates.map(date => 
                new Date(date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            ).join(', ')}</small>`
            : '';

        itemsHtml += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <strong>${item.name}</strong> (${item.itemType})
                    ${bookingDatesHtml}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `;
    });

    const paymentSummarySection = paymentAmountType === 'cash_payment' ? `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin-top: 0; color: #495057;">${paymentIcon} Payment Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Total Order Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 18px;">$${order.totalAmount.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #eee;">
                    <td style="padding: 8px 0; font-weight: bold; color: ${paymentSectionColor};">Payment Method:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 16px; color: ${paymentSectionColor}; font-weight: bold;">Cash After Service</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Payment Status:</td>
                    <td style="padding: 8px 0; text-align: right;">
                        <span style="background: ${paymentSectionColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                            ${paymentStatusText}
                        </span>
                    </td>
                </tr>
            </table>
        </div>
    ` : `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin-top: 0; color: #495057;">${paymentIcon} Payment Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Total Order Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 18px;">$${order.totalAmount.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #eee;">
                    <td style="padding: 8px 0; font-weight: bold; color: #28a745;">Amount Paid:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #28a745; font-weight: bold;">$${order.paidAmount.toFixed(2)}</td>
                </tr>
                ${order.remainingAmount > 0 ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #dc3545;">Remaining Balance:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #dc3545; font-weight: bold;">$${order.remainingAmount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Payment Status:</td>
                    <td style="padding: 8px 0; text-align: right;">
                        <span style="background: ${order.paymentStatus === 'completed' ? '#28a745' : '#ffc107'}; color: ${order.paymentStatus === 'completed' ? 'white' : '#212529'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                            ${paymentStatusText}
                        </span>
                    </td>
                </tr>
            </table>
        </div>
    `;

    const paymentInfoSection = paymentAmountType === 'cash_payment' ? `
        <div style="background: #e1f5fe; border: 1px solid #4fc3f7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin-top: 0; color: #0277bd;">💵 Cash Payment Information</h4>
            <p style="margin-bottom: 0; color: #0277bd;">
                <strong>Total amount of $${order.totalAmount.toFixed(2)} will be collected in cash on the service date.</strong><br>
                Please have the exact amount ready or we can provide change. Our team will contact you before the service date to confirm payment arrangements.
            </p>
        </div>
    ` : (order.remainingAmount > 0 ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin-top: 0; color: #856404;">💡 Remaining Payment</h4>
            <p style="margin-bottom: 0; color: #856404;">
                You have a remaining balance of <strong>$${order.remainingAmount.toFixed(2)}</strong> 
                which will be collected before or on the service date. We'll contact you closer to your event date 
                to arrange the final payment.
            </p>
        </div>
    ` : `
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin-top: 0; color: #155724;">✅ Payment Complete</h4>
            <p style="margin-bottom: 0; color: #155724;">
                Congratulations! Your order has been paid in full. No additional payment is required.
            </p>
        </div>
    `);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Confirmation - PlanIt_Nepal</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your wedding order</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                <h2 style="color: #495057; margin-top: 0;">Hello ${user.name},</h2>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                    Great news! Your wedding order has been confirmed${paymentAmountType === 'cash_payment' ? '' : ' and payment has been processed successfully'}. 
                    We're excited to be part of your special day! 💍✨
                </p>

                <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                    <h3 style="margin-top: 0; color: #28a745;">📋 Order Details</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Order ID:</td>
                            <td style="padding: 8px 0;">#${order._id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Order Date:</td>
                            <td style="padding: 8px 0;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;">
                                <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                                    ${order.status}
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="margin-top: 0; color: #495057;">🛍️ Items Ordered</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                ${paymentSummarySection}

                ${paymentInfoSection}

                <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #17a2b8;">
                    <h3 style="margin-top: 0; color: #17a2b8;">📞 Contact Information</h3>
                    <p style="margin-bottom: 10px;"><strong>Name:</strong> ${user.name}</p>
                    <p style="margin-bottom: 10px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin-bottom: 0;"><strong>Phone:</strong> ${user.number || 'Not provided'}</p>
                </div>

                <div style="background: #e9ecef; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3 style="margin-top: 0; color: #495057;">🎊 What's Next?</h3>
                    <p style="margin-bottom: 15px;">
                        Our team will review your order and contact you within 24-48 hours to discuss the details 
                        and coordinate the timeline for your special day.
                    </p>
                    <p style="margin-bottom: 0; font-size: 14px; color: #6c757d;">
                        For any questions or concerns, please reply to this email or contact our customer service team.
                        We're here to make your wedding day absolutely perfect! 💕
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">
                        Thank you for choosing PlanIt_Nepal<br>
                        Making your dreams come true, one celebration at a time ✨
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
};

const sendOrderConfirmationEmail = async (orderData, paymentAmountType = 'advance_payment') => {
    try {
        const transporter = await createTransporter();
        
        const { order, user } = orderData;
        
        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: user.email,
            subject: `🎉 Order Confirmed - PlanIt_Nepal (Order #${order._id})`,
            html: generateOrderEmailTemplate(order, user, paymentAmountType),
            text: `
Order Confirmation - PlanIt_Nepal

Hello ${user.name},

Your wedding order has been confirmed!

Order Details:
- Order ID: #${order._id}
- Total Amount: $${order.totalAmount}
- Paid Amount: $${order.paidAmount}
- Remaining: $${order.remainingAmount}
- Status: ${order.status}

Thank you for choosing PlanIt_Nepal!
            `.trim()
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('📧 Order confirmation email sent successfully:', result.messageId);
        return true;
        
    } catch (error) {
        console.error('❌ Error sending order confirmation email:', error);
        throw error; 
    }
};


const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const transporter = await createTransporter();
        
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject: '🔒 Reset Your Password - PlanIt_Nepal',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Reset Password - PlanIt_Nepal</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">🔒 Password Reset</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Reset your PlanIt_Nepal account password</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                        <h2 style="color: #495057; margin-top: 0;">Password Reset Request</h2>
                        
                        <p style="font-size: 16px; margin-bottom: 25px;">
                            We received a request to reset your password. Click the button below to set a new password for your account.
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                Reset My Password
                            </a>
                        </div>

                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h4 style="margin-top: 0; color: #856404;">⏰ Important</h4>
                            <p style="margin-bottom: 0; color: #856404;">
                                This reset link will expire in <strong>1 hour</strong> for security reasons. 
                                If you didn't request this password reset, please ignore this email.
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #6c757d; text-align: center;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
                        </p>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                                PlanIt_Nepal Security Team<br>
                                Making your account secure ✨
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Password Reset Request

We received a request to reset your password for your PlanIt_Nepal account.

Click the following link to reset your password: ${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

PlanIt_Nepal Security Team`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('📧 Password reset email sent successfully:', result.messageId);
        return true;
        
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        throw error;
    }
};


const sendVerificationOTP = async (email, name, otpCode) => {
    try {
        const transporter = await createTransporter();
        
        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject: '🔐 Verify Your Email - PlanIt_Nepal',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Email Verification - PlanIt_Nepal</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">🔐 Email Verification</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Verify your PlanIt_Nepal account</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                        <h2 style="color: #495057; margin-top: 0;">Hello ${name},</h2>
                        
                        <p style="font-size: 16px; margin-bottom: 25px;">
                            Welcome to PlanIt_Nepal! Please verify your email address to complete your account setup.
                        </p>

                        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745; text-align: center;">
                            <h3 style="margin-top: 0; color: #28a745;">Your Verification Code</h3>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #495057; font-family: monospace;">
                                    ${otpCode}
                                </span>
                            </div>
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                                Enter this 6-digit code in the verification form
                            </p>
                        </div>

                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h4 style="margin-top: 0; color: #856404;">⏰ Important</h4>
                            <p style="margin-bottom: 0; color: #856404;">
                                This verification code will expire in <strong>1 hour</strong> for security reasons. 
                                If you didn't create this account, please ignore this email.
                            </p>
                        </div>

                        <div style="background: #e9ecef; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin-top: 0; color: #495057;">🎊 What's Next?</h3>
                            <p style="margin-bottom: 0; font-size: 14px; color: #6c757d;">
                                After verification, you'll have full access to all PlanIt_Nepal features. 
                                Start planning your perfect wedding day! 💕
                            </p>
                        </div>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                                PlanIt_Nepal Team<br>
                                Welcome to the family ✨
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Email Verification - PlanIt_Nepal

Hello ${name},

Welcome to PlanIt_Nepal! Please verify your email address to complete your account setup.

Your verification code: ${otpCode}

This code will expire in 1 hour for security reasons.

If you didn't create this account, please ignore this email.

PlanIt_Nepal Team`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('📧 Verification email sent successfully:', result.messageId);
        return true;
        
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw error;
    }
};

module.exports = {
    sendOrderConfirmationEmail,
    sendPasswordResetEmail,
    sendVerificationOTP
};