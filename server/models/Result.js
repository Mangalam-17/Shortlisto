const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    drive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drive',
        required: true
    },
    assessmentTest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentTest',
        required: true
    },
    answers: [{
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOption: Number, // Index
        timeSpent: Number // In seconds
    }],
    totalScore: {
        type: Number,
        default: 0
    },
    maxScore: {
        type: Number,
        default: 0
    },
    proctoringLogs: [{
        event: String, // 'tab_switch', 'abnormal_cursor'
        timestamp: Date
    }],
    markedForReview: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }], // Questions flagged for review
    isPartialSave: {
        type: Boolean,
        default: false
    }, // True if auto-saved, false if final submission
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for high-frequency queries
ResultSchema.index({ candidate: 1, drive: 1, assessmentTest: 1 }, { unique: true }); // Ensure one final result per candidate-test combo
ResultSchema.index({ drive: 1, totalScore: -1 }); // Rank/Leaderboard analysis
ResultSchema.index({ submittedAt: -1 });
ResultSchema.index({ isPartialSave: 1 }); // Filter for active vs finished tests
ResultSchema.index({ assessmentTest: 1 }); // Assessment lookup

module.exports = mongoose.model('Result', ResultSchema);
