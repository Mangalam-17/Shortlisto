const Candidate = require('../models/Candidate');
const Drive = require('../models/Drive');
const AssessmentTest = require('../models/AssessmentTest');
const crypto = require('crypto');
const cacheManager = require('../utils/cache/cacheManager');

/**
 * Candidate Service Layer
 * Handles candidate-related business logic
 */
class CandidateService {
    /**
     * Check if drive exists and is active
     * @param {string} driveId 
     * @returns {Promise<Object>} - Drive object or error
     */
    static async validateDrive(driveId) {
        const drive = await Drive.findById(driveId).lean();
        if (!drive) {
            return { error: 'Assessment Drive not found', status: 404 };
        }

        if (drive.endTime && new Date(drive.endTime) < new Date()) {
            return { error: 'Registration for this drive has closed', status: 400 };
        }

        return { drive };
    }

    /**
     * Check if candidate already registered for drive
     * @param {string} email
     * @param {string} driveId
     * @returns {Promise<Object>} - Candidate or null
     */
    static async findExistingCandidate(email, driveId) {
        return await Candidate.findOne({ email, drive: driveId }).lean();
    }

    /**
     * Get drives created by admin with caching
     * @param {string} adminId
     * @returns {Promise<Array>} - Array of drive IDs
     */
    static async getAdminDriveIds(adminId) {
        const drivesCacheKey = `admin_drives:${adminId}`;
        let adminDriveIds = await cacheManager.get(drivesCacheKey);

        if (!adminDriveIds) {
            const drives = await Drive.find({ createdBy: adminId }).select('_id').lean();
            adminDriveIds = drives.map(d => d._id.toString());
            await cacheManager.set(drivesCacheKey, adminDriveIds, 300);
        }

        return adminDriveIds;
    }

    /**
     * Get candidates for a drive with pagination
     * @param {string} driveId
     * @param {Object} pagination
     * @returns {Promise<Array>} - Array of candidates
     */
    static async getCandidatesByDrive(driveId, { skip, limit }) {
        return await Candidate.find({ drive: driveId })
            .select('name email contact university isShortlisted cgpa academicPerformance technicalSkills workExperience currentCTC expectedCTC responses')
            .populate('drive', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Get candidate count for a drive
     * @param {string} driveId
     * @returns {Promise<number>} - Count
     */
    static async getCandidateCount(driveId) {
        return await Candidate.countDocuments({ drive: driveId });
    }

    /**
     * Get shortlisted candidates for a drive
     * @param {string} driveId
     * @returns {Promise<Array>} - Array of candidates
     */
    static async getShortlistedCandidates(driveId) {
        return await Candidate.find({
            drive: driveId,
            isShortlisted: true
        }).lean();
    }

    /**
     * Generate password reset token
     * @param {string} email
     * @returns {Promise<string>} - Reset token
     */
    static async generateResetToken(email) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await Candidate.updateOne(
            { email },
            { 
                $set: { 
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: resetTokenExpiry
                }
            }
        );

        return resetToken;
    }

    /**
     * Find candidate by reset token
     * @param {string} resetToken
     * @returns {Promise<Object>} - Candidate or null
     */
    static async findByResetToken(resetToken) {
        return await Candidate.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).lean();
    }

    /**
     * Update candidate password
     * @param {string} candidateId
     * @param {string} hashedPassword
     * @returns {Promise<Object>} - Update result
     */
    static async updatePassword(candidateId, hashedPassword) {
        await Candidate.updateOne(
            { _id: candidateId },
            { 
                $set: { 
                    password: hashedPassword,
                    resetPasswordToken: undefined,
                    resetPasswordExpires: undefined
                }
            }
        );

        return { success: true };
    }

    /**
     * Bulk shortlist candidates
     * @param {Array} candidateIds
     * @param {string} driveId
     * @returns {Promise<Object>} - Update result
     */
    static async bulkShortlist(candidateIds, driveId) {
        const result = await Candidate.updateMany(
            { _id: { $in: candidateIds }, drive: driveId },
            { $set: { isShortlisted: true, shortlistedAt: new Date() } }
        );

        return { 
            success: true, 
            modifiedCount: result.modifiedCount 
        };
    }

    /**
     * Get candidate assessment details
     * @param {string} candidateId
     * @returns {Promise<Object>} - Candidate with assessments
     */
    static async getCandidateAssessments(candidateId) {
        return await Candidate.findById(candidateId)
            .select('name email drive assessments assessmentTest assessmentSession')
            .lean();
    }
}

module.exports = CandidateService;
