const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendMail } = require('../utils/email/emailHelper');

/* ─── helpers ─── */
const signToken = (adminId) => {
    return new Promise((resolve, reject) => {
        const payload = { admin: { id: adminId } };
        const jwtExpire = process.env.JWT_EXPIRE || '5d';
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: jwtExpire }, (err, token) => {
            if (err) reject(err);
            else resolve(token);
        });
    });
};

/* ─── GET /api/auth/setup-status ─── */
exports.getSetupStatus = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments({ inviteAccepted: true });
        res.json({ registrationOpen: adminCount === 0 });
    } catch (err) {
        console.error('Setup status error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── GET /api/auth/validate-invite?token=xxx ─── */
exports.validateInvite = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ valid: false, msg: 'Token is required' });

        const admin = await Admin.findOne({
            inviteToken: token,
            inviteAccepted: false,
            inviteTokenExpiry: { $gt: new Date() }
        });

        if (!admin) {
            return res.status(400).json({ valid: false, msg: 'Invite link is invalid or has expired.' });
        }

        res.json({ valid: true, email: admin.email });
    } catch (err) {
        console.error('Validate invite error:', err.message);
        res.status(500).json({ valid: false, msg: 'Server Error' });
    }
};

/* ─── POST /api/auth/register ─── */
exports.registerAdmin = async (req, res) => {
    const { name, email, password, inviteToken } = req.body;

    try {
        const acceptedCount = await Admin.countDocuments({ inviteAccepted: true });

        /* ── Path A: First admin (no one exists yet) ── */
        if (acceptedCount === 0) {
            let admin = await Admin.findOne({ email });
            if (admin && admin.inviteAccepted) {
                return res.status(400).json({ msg: 'Admin already exists' });
            }

            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPassword = await bcrypt.hash(password, salt);

            if (admin) {
                // Pending invite doc — complete it
                admin.name = name;
                admin.password = hashedPassword;
                admin.inviteToken = null;
                admin.inviteTokenExpiry = null;
                admin.inviteAccepted = true;
            } else {
                admin = new Admin({
                    name,
                    email,
                    password: hashedPassword,
                    inviteAccepted: true
                });
            }

            try {
                await admin.save();
            } catch (saveErr) {
                if (saveErr.code === 11000) {
                    return res.status(400).json({ msg: 'Admin already exists' });
                }
                throw saveErr;
            }

            const token = await signToken(admin.id);
            return res.json({ token });
        }

        /* ── Path B: Invite-based registration ── */
        if (!inviteToken) {
            return res.status(403).json({ msg: 'An invite token is required to register.' });
        }

        const admin = await Admin.findOne({
            inviteToken,
            inviteAccepted: false,
            inviteTokenExpiry: { $gt: new Date() }
        });

        if (!admin) {
            return res.status(400).json({ msg: 'Invite link is invalid or has expired.' });
        }

        // Validate email matches the invite
        if (admin.email !== email.toLowerCase().trim()) {
            return res.status(400).json({ msg: 'Email does not match the invite.' });
        }

        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const salt = await bcrypt.genSalt(saltRounds);
        admin.name = name;
        admin.password = await bcrypt.hash(password, salt);
        admin.inviteToken = null;
        admin.inviteTokenExpiry = null;
        admin.inviteAccepted = true;

        await admin.save();

        const token = await signToken(admin.id);
        return res.json({ token });

    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── POST /api/auth/invite ─── */
exports.sendAdminInvite = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if this email already has an accepted admin account
        const existing = await Admin.findOne({ email, inviteAccepted: true });
        if (existing) {
            return res.status(400).json({ msg: 'An admin with this email already exists.' });
        }

        // Generate secure token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        // Upsert — update existing pending invite or create new one
        await Admin.findOneAndUpdate(
            { email, inviteAccepted: false },
            {
                email,
                inviteToken: rawToken,
                inviteTokenExpiry: expiry,
                inviteAccepted: false,
                invitedBy: req.admin.id
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Build invite URL
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const inviteUrl = `${clientUrl}/admin/register?token=${rawToken}`;

        // Send email
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #080808; color: #ffffff; border-radius: 16px; overflow: hidden;">
                <div style="padding: 40px 40px 32px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <p style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 4px; letter-spacing: -0.5px;">You're invited to Shortlisto</p>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 0;">Admin access invitation</p>
                </div>
                <div style="padding: 32px 40px;">
                    <p style="font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px;">
                        You've been invited to join Shortlisto as an admin. Click the button below to set up your account.
                    </p>
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #ffffff; color: #000000; font-weight: 700; font-size: 13px; border-radius: 10px; text-decoration: none; letter-spacing: 0.01em;">
                        Accept Invitation →
                    </a>
                    <p style="font-size: 12px; color: rgba(255,255,255,0.25); margin: 24px 0 0;">
                        This invite expires in 48 hours. If you didn't expect this, you can ignore this email.
                    </p>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.15); margin: 12px 0 0; word-break: break-all;">
                        ${inviteUrl}
                    </p>
                </div>
            </div>
        `;

        await sendMail({
            to: email,
            subject: 'You\'ve been invited to Shortlisto',
            text: `You've been invited to join Shortlisto as an admin. Accept your invite here: ${inviteUrl} (expires in 48 hours)`,
            html
        });

        res.json({ msg: `Invite sent to ${email}` });

    } catch (err) {
        console.error('Send invite error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── GET /api/auth/invites ─── */
exports.listInvites = async (req, res) => {
    try {
        const invites = await Admin.find({ inviteAccepted: false })
            .select('email inviteTokenExpiry invitedBy createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.json(invites.map(inv => ({
            id: inv._id,
            email: inv.email,
            expiry: inv.inviteTokenExpiry,
            expired: inv.inviteTokenExpiry ? new Date() > new Date(inv.inviteTokenExpiry) : true,
            invitedBy: inv.invitedBy,
            createdAt: inv.createdAt
        })));
    } catch (err) {
        console.error('List invites error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── DELETE /api/auth/invites/:id ─── */
exports.revokeInvite = async (req, res) => {
    try {
        const invite = await Admin.findOne({ _id: req.params.id, inviteAccepted: false });
        if (!invite) return res.status(404).json({ msg: 'Invite not found' });
        await invite.deleteOne();
        res.json({ msg: 'Invite revoked' });
    } catch (err) {
        console.error('Revoke invite error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── POST /api/auth/login ─── */
exports.loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email, inviteAccepted: true });
        if (!admin) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const token = await signToken(admin.id);
        return res.json({ token });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/* ─── GET /api/auth & /api/auth/me ─── */
exports.getAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password -inviteToken');
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }
        res.json(admin);
    } catch (err) {
        console.error('Get admin error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
