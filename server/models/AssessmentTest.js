const mongoose = require('mongoose');

const AssessmentTestSchema = new mongoose.Schema({
    drive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drive',
        required: true
    },
    name: {
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for high-frequency queries
AssessmentTestSchema.index({ drive: 1, createdAt: -1 });
AssessmentTestSchema.index({ createdBy: 1 });
AssessmentTestSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('AssessmentTest', AssessmentTestSchema);
