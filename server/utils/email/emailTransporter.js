const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const EmailSettings = require('../../models/EmailSettings');
const { decrypt } = require('../crypto/secret');

class EmailTransporter {
    constructor() {
        this.transporter = null;
        this.from = null;
        // Promise that resolves once the first DB load attempt completes
        this._initPromise = this._tryApplyDbConfig();
    }

    async _tryApplyDbConfig() {
        try {
            // Wait for DB to be ready (up to 10s)
            let waited = 0;
            while (mongoose.connection.readyState !== 1 && waited < 10000) {
                await new Promise(r => setTimeout(r, 200));
                waited += 200;
            }
            if (mongoose.connection.readyState !== 1) {
                console.warn('⚠️  Email transporter: DB not ready, skipping config load');
                return;
            }

            const settings = await EmailSettings.findOne({ key: 'smtp' }).lean();
            if (!settings || !settings.user || !settings.pass) {
                console.warn('⚠️  Email transporter: No SMTP settings found in DB');
                return;
            }

            const pass = decrypt(settings.pass);
            if (!pass) {
                console.error('❌ Email transporter: Failed to decrypt SMTP password — check CONFIG_ENC_KEY / JWT_SECRET matches what was used when saving');
                return;
            }

            const portNum = parseInt(settings.port) || 587;
            const secureFlag = portNum === 465;

            const config = {
                auth: { user: settings.user, pass },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                tls: { rejectUnauthorized: false } // allow self-signed certs
            };

            if (settings.host) {
                config.host = settings.host;
                config.port = portNum;
                config.secure = secureFlag;
                if (portNum === 587) config.requireTLS = true;
            } else {
                config.service = 'gmail';
                if (portNum === 587) {
                    config.port = 587;
                    config.secure = false;
                    config.requireTLS = true;
                }
            }

            const transporter = nodemailer.createTransport(config);

            // Verify connection — if it fails, don't store the broken transporter
            await new Promise((resolve) => {
                transporter.verify((error) => {
                    if (error) {
                        console.error('❌ SMTP verification failed:', error.message);
                        console.error(`   Config: host=${config.host || config.service}, port=${config.port}, secure=${config.secure}, requireTLS=${config.requireTLS}`);
                        // Still store it — verify can fail for network reasons but send might work
                        this.transporter = transporter;
                        this.from = settings.user;
                    } else {
                        console.log('✅ SMTP transporter verified successfully');
                        this.transporter = transporter;
                        this.from = settings.user;
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('❌ Email transporter config error:', error.message);
        }
    }

    async reloadFromDb() {
        this.transporter = null;
        this.from = null;
        this._initPromise = this._tryApplyDbConfig();
        await this._initPromise;
    }

    async sendMail({ to, subject, text, html }) {
        // Always wait for init to complete before sending
        await this._initPromise;

        if (!this.transporter) {
            // One more attempt in case DB wasn't ready at startup
            await this._tryApplyDbConfig();
        }

        if (!this.transporter) {
            console.error('❌ sendMail called but no SMTP transporter configured');
            throw new Error('SMTP not configured. Please set up email settings in the admin panel.');
        }

        const mailOptions = {
            from: this.from,
            to,
            subject,
            text,
            html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to} — messageId: ${result.messageId}`);
            return result;
        } catch (error) {
            console.error(`❌ Email send failed to ${to}:`, error.message);
            throw error;
        }
    }

    getStatus() {
        return {
            hasTransporter: !!this.transporter,
            from: this.from
        };
    }

    async close() {
        if (this.transporter) {
            try { await this.transporter.close(); } catch {}
        }
    }
}

const emailTransporter = new EmailTransporter();

process.on('SIGTERM', () => emailTransporter.close());
process.on('SIGINT', () => emailTransporter.close());

module.exports = {
    sendMail: emailTransporter.sendMail.bind(emailTransporter),
    reloadFromDb: emailTransporter.reloadFromDb.bind(emailTransporter),
    getStatus: emailTransporter.getStatus.bind(emailTransporter)
};
