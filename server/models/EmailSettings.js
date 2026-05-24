const mongoose = require('mongoose');

const EmailSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        default: 'smtp'
    },
    host: String,
    port: Number,
    secure: Boolean,
    user: String,
    pass: String,
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

EmailSettingsSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('EmailSettings', EmailSettingsSchema);
