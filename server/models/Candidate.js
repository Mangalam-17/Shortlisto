const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    whatsapp: String,
    currentCity: String,
    homeState: String,
    
    // Academic Information
    educationLevel: String,
    yearOfStudy: String,
    semester: Number,
    expectedGraduationYear: Number,
    major: String,
    academicPerformance: Number, // Primary CGPA storage
    backlogs: String,
    university: String,
    
    // Professional Information
    workExperience: Number,
    currentCompany: String,
    currentRole: String,
    noticePeriod: String,
    currentCTC: Number,
    expectedCTC: Number,
    internshipExperience: String,
    internshipCompany: String,
    internshipDuration: Number,
    internshipRole: String,
    
    // Technical Skills & Portfolio
    technicalSkills: [String],
    portfolioLink: String,
    linkedinProfile: String,
    
    cgpa: Number, // Kept for legacy compatibility
    drive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drive',
        required: true
    },
    isShortlisted: {
        type: Boolean,
        default: false
    },
    assessmentTest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentTest'
    },
    assessmentCredentials: {
        username: String, // email
        password: String
    },
    // Multi-Assessment Support: Isolation per test
    assessments: [
        {
            testId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'AssessmentTest',
                required: true
            },
            password: { type: String, required: true }, // Hashed specifically for THIS test
            status: { 
                type: String, 
                enum: ['invited', 'started', 'completed'], 
                default: 'invited' 
            },
            startedAt: Date,
            completedAt: Date,
            score: Number,
            responses: {
                type: Map,
                of: mongoose.Schema.Types.Mixed,
                default: {}
            },
            session: {
                questionOrder: [String], // Array of Question IDs
                optionMaps: Map // Map of Question ID -> Original Option Indices [0,2,1,3]
            }
        }
    ],
    assessmentSession: {
        questionOrder: [String], // Array of Question IDs
        optionMaps: Map // Map of Question ID -> Original Option Indices [0,2,1,3]
    },
    responses: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for high-frequency queries
CandidateSchema.index({ email: 1, drive: 1 }, { unique: true });
CandidateSchema.index({ drive: 1, createdAt: -1 });
CandidateSchema.index({ isShortlisted: 1, drive: 1 });
CandidateSchema.index({ university: 1 });
CandidateSchema.index({ cgpa: -1 });
CandidateSchema.index({ email: 1 }); // Quick lookup for login
CandidateSchema.index({ name: 'text', email: 'text' }); // Search optimization
CandidateSchema.index({ technicalSkills: 1 }); // Multi-select filtering
CandidateSchema.index({ assessmentTest: 1 }); // Assessment lookup
CandidateSchema.index({ academicPerformance: -1 });
CandidateSchema.index({ currentCity: 1 });
CandidateSchema.index({ homeState: 1 });
CandidateSchema.index({ drive: 1, isShortlisted: 1, academicPerformance: -1 }); // Compound index for filtering

module.exports = mongoose.model('Candidate', CandidateSchema);
