const mongoose = require('mongoose');

const DriveSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: false
    },
    university: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    recruitmentType: {
        type: String,
        enum: ['campus', 'lateral', 'custom'],
        default: 'campus'
    },
    formConfig: {
        type: Map,
        of: {
            enabled: { type: Boolean, default: true },
            required: { type: Boolean, default: true }
        },
        default: {}
    },
    skillsConfig: {
        type: [String],
        default: []
    },
    formSchema: [
        {
            fieldId: { type: String, required: true },
            label: { type: String, required: true },
            type: { 
                type: String, 
                enum: ['text', 'email', 'phone', 'number', 'textarea', 'select', 'multi-select', 'checkbox', 'date', 'file', 'url'],
                required: true 
            },
            required: { type: Boolean, default: false },
            placeholder: { type: String },
            options: [String], // For select, multi-select, checkbox groups
            validation: {
                min: Number,
                max: Number,
                pattern: String
            },
            section: { type: String },
            order: { type: Number, default: 0 },
            sameAs: { type: String } // e.g., "whatsapp same as phone"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for high-frequency queries
DriveSchema.index({ createdBy: 1, createdAt: -1 });
DriveSchema.index({ university: 1 });
DriveSchema.index({ startTime: 1, endTime: 1 });
DriveSchema.index({ recruitmentType: 1 });

module.exports = mongoose.model('Drive', DriveSchema);
