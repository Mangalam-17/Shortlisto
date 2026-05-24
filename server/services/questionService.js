const Question = require('../models/Question');
const cacheManager = require('../utils/cache/cacheManager');

/**
 * Question Service with Drive-Level Caching
 * Optimizes question fetching for assessments
 */
class QuestionService {
    /**
     * Get questions for a drive with caching
     * @param {string} driveId - Drive ID
     * @param {boolean} includeCorrectAnswer - Whether to include correct answers
     * @param {number} ttl - Cache TTL in seconds (default: 10 minutes)
     */
    static async getQuestionsByDrive(driveId, includeCorrectAnswer = false, ttl = 600) {
        const cacheKey = `questions:drive:${driveId}:${includeCorrectAnswer ? 'with_answer' : 'no_answer'}`;
        
        try {
            // Try cache first
            const cachedQuestions = await cacheManager.get(cacheKey);
            if (cachedQuestions) {
                console.log(`[CACHE HIT] Questions for drive ${driveId}`);
                return cachedQuestions;
            }
            
            console.log(`[CACHE MISS] Fetching questions for drive ${driveId}`);
            
            // Build query with projection
            const projection = includeCorrectAnswer ? {} : { '-correctAnswer': 0 };
            const questions = await Question.find({ drive: driveId })
                .select(projection)
                .lean(); // Use lean for better performance
            
            // Cache the result
            await cacheManager.set(cacheKey, questions, ttl);
            
            return questions;
        } catch (error) {
            console.error(`Error fetching questions for drive ${driveId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get specific questions by IDs with caching
     * @param {Array} questionIds - Array of question IDs
     * @param {boolean} includeCorrectAnswer - Whether to include correct answers
     */
    static async getQuestionsByIds(questionIds, includeCorrectAnswer = false) {
        if (!questionIds || questionIds.length === 0) {
            return [];
        }
        
        try {
            const projection = includeCorrectAnswer ? {} : { '-correctAnswer': 0 };
            const questions = await Question.find({ _id: { $in: questionIds } })
                .select(projection)
                .lean();
            
            return questions;
        } catch (error) {
            console.error('Error fetching questions by IDs:', error);
            throw error;
        }
    }
    
    /**
     * Invalidate drive-level question cache
     * @param {string} driveId - Drive ID
     */
    static async invalidateDriveCache(driveId) {
        try {
            await cacheManager.clearPattern(`questions:drive:${driveId}`);
            console.log(`[CACHE INVALIDATED] Drive ${driveId} questions cache cleared`);
        } catch (error) {
            console.error(`Error invalidating cache for drive ${driveId}:`, error);
        }
    }
    
    /**
     * Get question count for a drive
     * @param {string} driveId - Drive ID
     */
    static async getQuestionCount(driveId) {
        const cacheKey = `questions:count:${driveId}`;
        
        try {
            const cachedCount = await cacheManager.get(cacheKey);
            if (cachedCount !== null) {
                return cachedCount;
            }
            
            const count = await Question.countDocuments({ drive: driveId });
            await cacheManager.set(cacheKey, count, 300); // 5 minutes cache
            
            return count;
        } catch (error) {
            console.error(`Error getting question count for drive ${driveId}:`, error);
            throw error;
        }
    }
}

module.exports = QuestionService;
