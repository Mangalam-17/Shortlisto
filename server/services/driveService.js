const Drive = require('../models/Drive');
const cacheManager = require('../utils/cache/cacheManager');

/**
 * Drive Service Layer
 * Handles drive-related business logic
 */
class DriveService {
    /**
     * Get drives created by admin with caching
     * @param {string} adminId
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Array of drives
     */
    static async getDrivesByAdmin(adminId, options = {}) {
        const { skip = 0, limit = 50 } = options;
        
        const cacheKey = `admin_drives_list:${adminId}:${skip}:${limit}`;
        const cachedDrives = await cacheManager.get(cacheKey);
        
        if (cachedDrives) {
            return cachedDrives;
        }

        const drives = await Drive.find({ createdBy: adminId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        await cacheManager.set(cacheKey, drives, 300); // 5 minutes cache
        return drives;
    }

    /**
     * Get drive by ID with field selection
     * @param {string} driveId
     * @param {Array} fields - Fields to select
     * @returns {Promise<Object>} - Drive object or null
     */
    static async getDriveById(driveId, fields = []) {
        const projection = fields.length > 0 ? fields.join(' ') : '';
        return await Drive.findById(driveId)
            .select(projection)
            .lean();
    }

    /**
     * Get public drive information
     * @param {string} driveId
     * @returns {Promise<Object>} - Public drive info
     */
    static async getPublicDriveInfo(driveId) {
        return await Drive.findById(driveId)
            .select('name university startTime endTime recruitmentType formConfig skillsConfig formSchema role')
            .lean();
    }

    /**
     * Create new drive
     * @param {Object} driveData
     * @param {string} adminId
     * @returns {Promise<Object>} - Created drive
     */
    static async createDrive(driveData, adminId) {
        const drive = new Drive({
            ...driveData,
            createdBy: adminId
        });

        const savedDrive = await drive.save();
        
        // Invalidate cache
        await cacheManager.clearPattern(`admin_drives_list:${adminId}`);
        
        return savedDrive;
    }

    /**
     * Update drive
     * @param {string} driveId
     * @param {Object} updateData
     * @param {string} adminId
     * @returns {Promise<Object>} - Updated drive
     */
    static async updateDrive(driveId, updateData, adminId) {
        const drive = await Drive.findOneAndUpdate(
            { _id: driveId, createdBy: adminId },
            updateData,
            { new: true, runValidators: true }
        ).lean();

        // Invalidate cache
        await cacheManager.clearPattern(`admin_drives_list:${adminId}`);
        
        return drive;
    }

    /**
     * Delete drive
     * @param {string} driveId
     * @param {string} adminId
     * @returns {Promise<Object>} - Delete result
     */
    static async deleteDrive(driveId, adminId) {
        const result = await Drive.deleteOne({ _id: driveId, createdBy: adminId });
        
        // Invalidate cache
        await cacheManager.clearPattern(`admin_drives_list:${adminId}`);
        
        return { 
            success: result.deletedCount > 0,
            deletedCount: result.deletedCount 
        };
    }

    /**
     * Get drive statistics
     * @param {string} driveId
     * @returns {Promise<Object>} - Drive statistics
     */
    static async getDriveStats(driveId) {
        const [totalCandidates, shortlistedCount] = await Promise.all([
            Drive.collection.countDocuments({ _id: driveId }),
            Drive.collection.countDocuments({ _id: driveId, isShortlisted: true })
        ]);

        return {
            totalCandidates,
            shortlistedCount,
            shortlistRate: totalCandidates > 0 ? (shortlistedCount / totalCandidates) * 100 : 0
        };
    }

    /**
     * Validate drive ownership
     * @param {string} driveId
     * @param {string} adminId
     * @returns {Promise<Object>} - Validation result
     */
    static async validateOwnership(driveId, adminId) {
        const drive = await Drive.findById(driveId).select('createdBy').lean();
        
        if (!drive) {
            return { error: 'Drive not found', status: 404 };
        }
        
        if (drive.createdBy.toString() !== adminId) {
            return { error: 'Not authorized', status: 401 };
        }
        
        return { drive };
    }

    /**
     * Search drives
     * @param {string} adminId
     * @param {Object} searchOptions
     * @returns {Promise<Object>} - Search results
     */
    static async searchDrives(adminId, searchOptions) {
        const { query, pagination } = searchOptions;
        
        const [total, drives] = await Promise.all([
            Drive.countDocuments(query),
            Drive.find(query)
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean()
        ]);

        return { total, drives };
    }
}

module.exports = DriveService;
