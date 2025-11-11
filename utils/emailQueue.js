const { sendOrderConfirmationEmail, sendPasswordResetEmail, sendVerificationOTP } = require('./emailHelper');

class EmailQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.retryAttempts = 3;
        this.retryDelay = 2000;
    }

    add(emailType, data, options = {}) {
        const job = {
            id: Date.now() + Math.random(),
            type: emailType,
            data: data,
            priority: options.priority || 5,
            attempts: 0,
            maxAttempts: options.maxAttempts || this.retryAttempts,
            delay: options.delay || 0,
            createdAt: new Date(),
            status: 'waiting'
        };

        this.queue.push(job);
        this.queue.sort((a, b) => a.priority - b.priority);
        
        console.log(`📧 Email queued: ${emailType} for ${data.email || data.orderData?.user?.email || 'unknown'}`);
        
        if (!this.processing) {
            this.processQueue();
        }

        return job.id;
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        console.log(`🔄 Processing email queue (${this.queue.length} emails pending)`);

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            
            if (job.delay > 0) {
                setTimeout(() => {
                    this.queue.unshift(job);
                    job.delay = 0;
                }, job.delay);
                continue;
            }

            try {
                job.status = 'processing';
                await this.processJob(job);
                job.status = 'completed';
                console.log(`✅ Email sent successfully: ${job.type} (ID: ${job.id})`);
            } catch (error) {
                job.attempts++;
                job.status = 'failed';
                console.error(`❌ Email failed: ${job.type} (Attempt ${job.attempts}/${job.maxAttempts})`, error.message);

                if (job.attempts < job.maxAttempts) {
                    job.status = 'retrying';
                    job.delay = this.retryDelay * job.attempts;
                    this.queue.push(job);
                    console.log(`🔄 Retrying email in ${job.delay}ms: ${job.type}`);
                } else {
                    console.error(`💀 Email permanently failed after ${job.maxAttempts} attempts: ${job.type}`);
                }
            }

            await this.sleep(500);
        }

        this.processing = false;
        console.log('✨ Email queue processing completed');
    }

    async processJob(job) {
        switch (job.type) {
            case 'order-confirmation':
                return await sendOrderConfirmationEmail(job.data.orderData, job.data.paymentAmountType);
            
            case 'password-reset':
                return await sendPasswordResetEmail(job.data.email, job.data.resetToken);
            
            case 'verification-otp':
                return await sendVerificationOTP(job.data.email, job.data.name, job.data.otpCode);
            
            default:
                throw new Error(`Unknown email type: ${job.type}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            waiting: this.queue.filter(job => job.status === 'waiting').length,
            retrying: this.queue.filter(job => job.status === 'retrying').length,
            failed: this.queue.filter(job => job.status === 'failed').length
        };
    }

    clear() {
        this.queue = [];
        console.log('🗑️ Email queue cleared');
    }
}

const emailQueue = new EmailQueue();

const queueOrderConfirmationEmail = (orderData, paymentAmountType) => {
    return emailQueue.add('order-confirmation', {
        orderData,
        paymentAmountType
    }, {
        priority: 1,
        maxAttempts: 3
    });
};

const queuePasswordResetEmail = (email, resetToken) => {
    return emailQueue.add('password-reset', {
        email,
        resetToken
    }, {
        priority: 2,
        maxAttempts: 3
    });
};

const queueVerificationOTP = (email, name, otpCode) => {
    return emailQueue.add('verification-otp', {
        email,
        name,
        otpCode
    }, {
        priority: 2,
        maxAttempts: 3
    });
};

module.exports = {
    queueOrderConfirmationEmail,
    queuePasswordResetEmail,
    queueVerificationOTP,
    emailQueue
};