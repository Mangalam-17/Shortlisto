const Candidate = require('../models/Candidate');
const Drive = require('../models/Drive');
const AssessmentTest = require('../models/AssessmentTest');
const jwt = require('jsonwebtoken');
const cacheManager = require('../utils/cache/cacheManager');

/**
 * Assessment Service Layer
 * Handles assessment-related business logic
 */
class AssessmentService {
    /**
     * Get assessment tests for admin
     * @param {string} adminId
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Assessment tests
     */
    static async getAssessmentTests(adminId, options = {}) {
        const { isPaginated = false, skip = 0, limit = 50 } = options;
        
        // Get admin drive IDs with caching
        const drives = await Drive.find({ createdBy: adminId }).lean();
        const driveIds = drives.map(d => d._id);
        const query = { $or: [{ createdBy: adminId }, { drive: { $in: driveIds } }] };

        if (isPaginated) {
            const [total, tests] = await Promise.all([
                AssessmentTest.countDocuments(query),
                AssessmentTest.find(query)
                    .populate('drive', 'name university')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
            ]);
            
            return { total, tests };
        } else {
            const tests = await AssessmentTest.find(query)
                .populate('drive', 'name university')
                .sort({ createdAt: -1 })
                .lean();
                
            return { tests };
        }
    }

    /**
     * Get assessment tests by drive
     * @param {string} driveId
     * @returns {Promise<Array>} - Assessment tests
     */
    static async getTestsByDrive(driveId) {
        return await AssessmentTest.find({ drive: driveId })
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Create new assessment test
     * @param {Object} testData
     * @param {string} adminId
     * @returns {Promise<Object>} - Created test
     */
    static async createAssessment(testData, adminId) {
        const test = new AssessmentTest({
            ...testData,
            createdBy: adminId
        });

        const savedTest = await test.save();
        return savedTest;
    }

    /**
     * Update assessment test
     * @param {string} testId
     * @param {Object} updateData
     * @param {string} adminId
     * @returns {Promise<Object>} - Updated test
     */
    static async updateAssessment(testId, updateData, adminId) {
        const test = await AssessmentTest.findOneAndUpdate(
            { _id: testId, createdBy: adminId },
            updateData,
            { new: true, runValidators: true }
        ).lean();

        return test;
    }

    /**
     * Delete assessment test
     * @param {string} testId
     * @param {string} adminId
     * @returns {Promise<Object>} - Delete result
     */
    static async deleteAssessment(testId, adminId) {
        const result = await AssessmentTest.deleteOne({ _id: testId, createdBy: adminId });
        
        return { 
            success: result.deletedCount > 0,
            deletedCount: result.deletedCount 
        };
    }

    /**
     * Authenticate candidate for assessment
     * @param {string} email
     * @param {string} password
     * @param {string} testId
     * @returns {Promise<Object>} - Authentication result
     */
    static async authenticateCandidate(email, password, testId) {
        const candidate = await Candidate.findOne({ email })
            .select('password assessments assessmentTest')
            .lean();

        if (!candidate) {
            return { error: 'Invalid Credentials', status: 400 };
        }

        // Multi-Assessment Support Logic
        if (testId) {
            const testEntry = candidate.assessments.find(a => a.testId.toString() === testId);
            if (!testEntry) {
                return { error: 'You are not invited to this specific assessment', status: 400 };
            }
        }

        const isMatch = await require('bcryptjs').compare(password, candidate.password);
        if (!isMatch) {
            return { error: 'Invalid Credentials', status: 400 };
        }

        return { candidate };
    }

    /**
     * Generate JWT token for candidate
     * @param {Object} candidate
     * @param {string} testId
     * @returns {Promise<string>} - JWT token
     */
    static generateCandidateToken(candidate, testId) {
        const payload = {
            id: candidate._id,
            email: candidate.email,
            testId: testId || null
        };

        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    }

    /**
     * Check if candidate already submitted assessment
     * @param {Object} candidate
     * @param {string} testId
     * @returns {Promise<Object>} - Check result
     */
    static async checkAssessmentStatus(candidate, testId) {
        const assessments = candidate.assessments || [];
        const testEntry = assessments.find(a => a.testId.toString() === testId.toString());
        
        if (testEntry && testEntry.status === 'completed') {
            return { 
                error: 'Assessment already submitted', 
                status: 400,
                submitted: true 
            };
        }

        return { testEntry };
    }

    /**
     * Get candidate assessment session
     * @param {Object} candidate
     * @param {string} testId
     * @returns {Promise<Object>} - Session data
     */
    static async getAssessmentSession(candidate, testId) {
        const assessments = candidate.assessments || [];
        const testEntry = assessments.find(a => a.testId.toString() === testId.toString());
        
        return testEntry?.session || candidate.assessmentSession;
    }

    /**
     * Update candidate assessment session
     * @param {string} candidateId
     * @param {Object} sessionData
     * @returns {Promise<Object>} - Update result
     */
    static async updateAssessmentSession(candidateId, sessionData) {
        const result = await Candidate.updateOne(
            { _id: candidateId },
            { $set: { assessmentSession: sessionData } }
        );

        return { 
            success: result.modifiedCount > 0,
            modifiedCount: result.modifiedCount 
        };
    }

    /**
     * Update assessment status
     * @param {string} candidateId
     * @param {string} testId
     * @param {Object} statusData
     * @returns {Promise<Object>} - Update result
     */
    static async updateAssessmentStatus(candidateId, testId, statusData) {
        const assessments = await Candidate.findById(candidateId)
            .select('assessments')
            .lean();

        if (!assessments) {
            return { error: 'Candidate not found', status: 404 };
        }

        const testEntryIndex = assessments.assessments.findIndex(a => a.testId.toString() === testId.toString());
        
        if (testEntryIndex === -1) {
            return { error: 'Assessment not found', status: 404 };
        }

        // Update the specific assessment entry
        assessments.assessments[testEntryIndex] = {
            ...assessments.assessments[testEntryIndex],
            ...statusData
        };

        const result = await Candidate.updateOne(
            { _id: candidateId },
            { $set: { assessments: assessments.assessments } }
        );

        return { 
            success: result.modifiedCount > 0,
            modifiedCount: result.modifiedCount 
        };
    }
}

module.exports = AssessmentService;
