const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        default: null   // null until invite is accepted
    },
    // Invite-based registration fields
    inviteToken: {
        type: String,
        default: null,
        index: true
    },
    inviteTokenExpiry: {
        type: Date,
        default: null
    },
    inviteAccepted: {
        type: Boolean,
        default: false
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

AdminSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Admin', AdminSchema);
