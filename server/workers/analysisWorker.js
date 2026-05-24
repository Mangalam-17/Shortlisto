const queueManager = require('../utils/queue/queueManager');
const Question = require('../models/Question');
const Candidate = require('../models/Candidate');
const Result = require('../models/Result');
const cacheManager = require('../utils/cache/cacheManager');

/**
 * Helper for deterministic shuffling (duplicated here for worker isolation)
 */
const shuffleWithSeed = (array, seed) => {
    const arr = [...array];
    let m = arr.length, t, i;
    let seedNum = 0;
    for (let char of seed.toString()) seedNum += char.charCodeAt(0);
    const random = () => {
        seedNum = (seedNum * 1664525 + 1013904223) % 4294967296;
        return seedNum / 4294967296;
    };
    while (m) {
        i = Math.floor(random() * m--);
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
    }
    return arr;
};

/**
 * Analysis Worker: Calculates scores and generates results asynchronously.
 */
const analysisWorker = queueManager.createWorker('analysisQueue', async (job) => {
    const { candidateId, driveId, testId, answers, proctoringLogs } = job.data;
    
    console.log(`📊 Processing results for candidate: ${candidateId} | Test: ${testId || 'Legacy'}`);
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    const targetTestId = testId || candidate.assessmentTest;

    // Fetch questions specifically for this test if available, else drive
    let questionIds = (answers || []).map(a => a.questionId).filter(Boolean);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = {};
    questions.forEach(q => { questionMap[q._id.toString()] = q; });

    let totalScore = 0;
    const processedAnswers = [];
    const assessments = candidate.assessments || [];
    const testEntry = targetTestId ? assessments.find(a => a.testId.toString() === targetTestId.toString()) : null;
    const session = testEntry?.session || candidate.assessmentSession;

    for (const ans of (answers || [])) {
        const question = questionMap[ans.questionId];
        if (question) {
            let originalSelectedIndex = ans.selectedOption;
            
            if (session && session.optionMaps) {
                // Handle both Map (Mongoose) and plain object
                const optionMap = (session.optionMaps.get ? session.optionMaps.get(ans.questionId.toString()) : session.optionMaps[ans.questionId.toString()]);
                
                if (optionMap && Array.isArray(optionMap)) {
                    /**
                     * Fix: Map the shuffled index back to the original database index.
                     * When the student sees shuffled options:
                     * Shuffled Index: [0, 1, 2, 3] -> Maps to Original Indices: [2, 0, 3, 1]
                     * If student selects "0" (the first shuffled option), it actually corresponds to original index "2".
                     */
                    originalSelectedIndex = optionMap[ans.selectedOption];
                    console.log(`[DEBUG] Q: ${ans.questionId} | Student Selected Shuffled Index: ${ans.selectedOption} -> Maps to Original DB Index: ${originalSelectedIndex} | DB Correct Answer Index: ${question.correctAnswer}`);
                } else {
                    console.log(`[WARNING] No option map found for Q: ${ans.questionId}. Using raw index: ${ans.selectedOption}`);
                }
            }

            // Scoring: Compare the mapped original index with the database's correctAnswer index
            if (originalSelectedIndex !== undefined && question.correctAnswer === originalSelectedIndex) {
                totalScore += 1;
            }
            processedAnswers.push({
                question: question._id,
                selectedOption: originalSelectedIndex,
                timeSpent: ans.timeSpent || 0
            });
        }
    }

    // Fix: maxScore should be the total number of questions in the session/test, not just attempted ones
    let maxScore = session?.questionOrder?.length || questions.length;
    if (maxScore === 0) maxScore = processedAnswers.length;

    // Update or Create Result using findOneAndUpdate to avoid race conditions
    const query = { candidate: candidateId, drive: driveId, isPartialSave: false };
    if (targetTestId) query.assessmentTest = targetTestId;

    const update = {
        answers: processedAnswers,
        totalScore,
        maxScore,
        proctoringLogs: proctoringLogs || [],
        completedAt: new Date()
    };

    await Result.findOneAndUpdate(query, update, { upsert: true, new: true, runValidators: true });

    // Update candidate profile status/score
    const candidateAssessments = candidate.assessments || [];
    if (targetTestId && candidateAssessments.length > 0) {
        const testEntry = candidateAssessments.find(a => a.testId.toString() === targetTestId.toString());
        if (testEntry) {
            testEntry.status = 'completed';
            testEntry.score = totalScore;
            testEntry.completedAt = new Date();
        }
    } else {
        candidate.isShortlisted = false; // Legacy behavior
    }
    await candidate.save();
    
    // Invalidate analytics caches
    await Promise.all([
        cacheManager.del(`analytics:drive:${driveId}`),
        cacheManager.clearPattern(`analytics:admin`),
        cacheManager.clearPattern(`dashboard`)
    ]);

    // Cleanup partial saves ONLY for this test
    const cleanupQuery = { candidate: candidateId, isPartialSave: true };
    if (targetTestId) cleanupQuery.assessmentTest = targetTestId;
    await Result.deleteMany(cleanupQuery);

    return { success: true, score: totalScore };
}, { concurrency: 5 });

module.exports = analysisWorker;
