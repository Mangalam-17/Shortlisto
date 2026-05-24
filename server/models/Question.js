const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }], // Array of 4 strings
    correctAnswer: {
        type: Number, // Index 0-3
        required: true
    },
    drive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drive'
    }
});

// Create indexes
QuestionSchema.index({ drive: 1 });
QuestionSchema.index({ question: 'text' }); // For text search

module.exports = mongoose.model('Question', QuestionSchema);
