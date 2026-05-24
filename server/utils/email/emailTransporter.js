const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const EmailSettings = require('../../models/EmailSettings');
const { decrypt } = require('../crypto/secret');

/**
 * Optimized Email Transporter Service
 * Creates a single reusable transporter instance to reduce SMTP connection overhead
 */
class EmailTransporter {
    constructor() {
        this.transporter = null;
        this.isInitialized = false;
        this.currentSource = 'db';
        this.loading = false;
        this.initialize();
    }

    /**
     * Initialize the email transporter
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            this.isInitialized = true;
            this.tryApplyDbConfig();
        } catch (error) {
            console.error('❌ Failed to initialize email transporter:', error);
            this.transporter = null;
            this.isInitialized = true; // Mark as initialized to avoid retry loops
        }
    }

    buildEnvConfig() { return null; }

    async tryApplyDbConfig() {
        if (this.loading) return;
        this.loading = true;
        try {
            if (!(mongoose.connection && mongoose.connection.readyState === 1)) return;
            const settings = await EmailSettings.findOne({ key: 'smtp' }).lean();
            if (!(settings && settings.user && settings.pass)) return;
            const pass = decrypt(settings.pass);
            const portNum = parseInt(settings.port) || 587;
            let secureFlag = typeof settings.secure === 'boolean' ? settings.secure : (portNum === 465);
            if (portNum === 587) secureFlag = false;
            if (portNum === 465) secureFlag = true;

            const config = {
                auth: { user: settings.user, pass },
                pool: true,
                maxConnections: 5,
                maxMessages: 100
            };

            if (settings.host) {
                config.host = settings.host;
                config.port = portNum;
                config.secure = secureFlag;
                if (portNum === 587) config.requireTLS = true;
            } else {
                config.service = 'gmail';
                config.secure = secureFlag;
                if (portNum) config.port = portNum;
                if (portNum === 587) config.requireTLS = true;
            }
            const transporter = nodemailer.createTransport(config);
            this.transporter = transporter;
            this.currentSource = 'db';
            await new Promise(resolve => {
                transporter.verify((error, success) => {
                    if (error) {
                        console.warn('Email transporter verification failed:', error?.message || String(error));
                        console.warn(`SMTP config used -> host: ${config.host || config.service}, port: ${config.port || 'default'}, secure: ${config.secure === true}`);
                    }
                    resolve();
                });
            });
        } finally {
            this.loading = false;
        }
    }

    async reloadFromDb() {
        await this.tryApplyDbConfig();
    }

    /**
     * Send email using the optimized transporter
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text content
     * @param {string} options.html - HTML content
     * @returns {Promise} - Send result
     */
    async sendMail({ to, subject, text, html }) {
        if (!this.isInitialized) {
            // Wait for initialization if still in progress
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        const mailOptions = {
            to,
            subject,
            text,
            html
        };

        if (!mailOptions.from) {
            try {
                const settings = await EmailSettings.findOne({ key: 'smtp' }).lean();
                if (settings && settings.user) {
                    mailOptions.from = settings.user;
                }
            } catch {}
        }

        if (!this.transporter) {
            await this.tryApplyDbConfig();
        }
        if (this.transporter) {
            try {
                const result = await this.transporter.sendMail(mailOptions);
                return result;
            } catch (error) {
                console.error('❌ Email send failed:', error);
                throw error;
            }
        } else {
            // Mock mode for development
            console.log(`--- MOCK EMAIL ---`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            if (text) console.log(`Text: ${text}`);
            return { messageId: 'mock-id-' + Date.now() };
        }
    }

    /**
     * Get transporter status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasTransporter: !!this.transporter,
            isMockMode: !this.transporter
        };
    }

    /**
     * Close transporter connections gracefully
     */
    async close() {
        if (this.transporter) {
            try {
                await this.transporter.close();
                console.log('✅ Email transporter closed');
            } catch (error) {
                console.error('❌ Error closing email transporter:', error);
            }
        }
    }
}

// Singleton instance
const emailTransporter = new EmailTransporter();

// Graceful shutdown
process.on('SIGTERM', async () => {
    await emailTransporter.close();
});

process.on('SIGINT', async () => {
    await emailTransporter.close();
});

module.exports = { 
    sendMail: emailTransporter.sendMail.bind(emailTransporter), 
    reloadFromDb: emailTransporter.reloadFromDb.bind(emailTransporter),
    getStatus: emailTransporter.getStatus.bind(emailTransporter)
};
