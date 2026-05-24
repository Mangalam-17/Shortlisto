import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Clock, AlertOctagon, AlertTriangle, CheckCircle, Flag, Grid3x3, Save, Camera, Monitor, Wifi, WifiOff, Brain, Shield, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ProctoringSystem from '../../utils/proctoring';
import BehaviorAnalysis from '../../utils/behaviorAnalysis';
import socketService from '../../utils/socket';

const Assessment = () => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(null); // in seconds
    const [proctoringLogs, setProctoringLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [warnings, setWarnings] = useState(0);
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
    const [showQuestionPalette, setShowQuestionPalette] = useState(false);
    const [proctoringActive, setProctoringActive] = useState(false);
    const [webcamEnabled, setWebcamEnabled] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const [assessmentId, setAssessmentId] = useState(null);
    const [userId, setUserId] = useState(null);
    const [behaviorAnalysisActive, setBehaviorAnalysisActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [meta, setMeta] = useState(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitModalConfig, setSubmitModalConfig] = useState({ title: '', message: '' });

    const navigate = useNavigate();
    const submittedRef = useRef(false);
    const autoSaveTimeoutRef = useRef(null);
    const timeWarningsShown = useRef({ fiveMin: false, twoMin: false, thirtySec: false });
    const proctoringSystemRef = useRef(null);
    const behaviorAnalysisRef = useRef(null);

    // Per-question time tracking
    const questionTimesRef = useRef({}); // { questionId: totalSecondsSpent }
    const questionStartRef = useRef(Date.now()); // When user entered current question

    // Confirmation Modal Component
    const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-100 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-100 shadow-inner group">
                        <Flag className="text-[#E11D48] group-hover:scale-110 transition-transform duration-500" size={36} />
                    </div>
                    
                    <div className="text-center space-y-3 mb-8">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{title}</h3>
                        <p className="text-[10px] font-black text-[#E11D48] uppercase tracking-[0.4em] flex items-center justify-center">
                            <span className="w-6 h-[2px] bg-[#E11D48] mr-3"></span>
                            Final Submission
                            <span className="w-6 h-[2px] bg-[#E11D48] ml-3"></span>
                        </p>
                        <p className="text-slate-500 text-sm font-medium pt-2 leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-200"
                        >
                            Yes, Submit Assessment
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all duration-300"
                        >
                            No, Continue Test
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Track time when switching questions
    useEffect(() => {
        // Record start time for the new question
        questionStartRef.current = Date.now();

        return () => {
            // When leaving a question, accumulate the time spent
            if (questions.length > 0 && currentQuestion < questions.length) {
                const qId = questions[currentQuestion]?._id;
                if (qId) {
                    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
                    questionTimesRef.current[qId] = (questionTimesRef.current[qId] || 0) + elapsed;
                }
            }
        };
    }, [currentQuestion, questions]);

    // Fetch Questions & Saved Progress
    useEffect(() => {
        const init = async () => {
            try {
                // Get Meta for time and assessment info
                const metaRes = await api.get('/assessments/meta');

                // Check if assessment is still active (with a small buffer for safety)
                const buffer = 5000; // 5s buffer 
                const startTime = new Date(metaRes.data.drive.startTime).getTime();
                const now_time = new Date().getTime();

                if (metaRes.data.status === 'UPCOMING' && (startTime - now_time) > buffer) {
                    navigate('/assessment/waiting-room');
                    return;
                }

                if (metaRes.data.status === 'EXPIRED') {
                    setLoading(false); // Clear blank screen before redirecting
                    navigate('/assessment/ended');
                    return;
                }

                const endTime = new Date(metaRes.data.drive.endTime).getTime();
                const remaining = Math.max(0, Math.floor((endTime - now_time) / 1000));
                const currentAssessmentId = metaRes.data.drive._id;
                const currentUserId = metaRes.data.candidateId;

                setMeta(metaRes.data);
                setTimeLeft(remaining);
                setAssessmentId(currentAssessmentId);
                setUserId(currentUserId);

                // Get Questions
                const qRes = await api.get('/assessments/questions');
                if (!qRes.data || qRes.data.length === 0) {
                    setLoading(false);
                    setQuestions([]);
                    return;
                }
                setQuestions(qRes.data);

                // Get Saved Progress
                try {
                    const progressRes = await api.get('/assessments/progress');
                    if (progressRes.data.answers && progressRes.data.answers.length > 0) {
                        const savedAnswers = {};
                        progressRes.data.answers.forEach(ans => {
                            savedAnswers[ans.question] = ans.selectedOption;
                        });
                        setAnswers(savedAnswers);

                        if (progressRes.data.markedForReview) {
                            setMarkedForReview(new Set(progressRes.data.markedForReview));
                        }
                    }
                } catch (progressErr) {
                    // Silently ignore if no progress found
                }

                setLoading(false);

                // Initialize enhanced proctoring system
                initializeProctoring();

                // Initialize socket connection with values directly (not from state)
                initializeSocket(currentAssessmentId, currentUserId);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 400 && err.response?.data?.submitted) {
                    navigate('/assessment/thank-you');
                } else {
                    toast.error('Failed to load assessment');
                    navigate('/assessment/login');
                }
            }
        };
        init();
    }, [navigate]);

    // Initialize socket connection
    const initializeSocket = async (asmtId, uId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token || !asmtId || !uId) {
                return;
            }

            // Set socket callbacks
            socketService.setCallbacks({
                onConnect: () => {
                    setSocketConnected(true);

                    // Join assessment room
                    socketService.joinAssessment(asmtId, uId, 'candidate');
                },
                onDisconnect: (reason) => {
                    setSocketConnected(false);
                    toast.error('Connection lost. Some features may be limited.', { duration: 3000 });
                },
                onConnectError: (error) => {
                    console.error('Socket connection error:', error);
                    // Silently fail in production for socket connection errors to avoid distracting candidates
                    // The core functionality (auto-save, submit) works over HTTP
                    setSocketConnected(false);
                },
                onAdminMessage: (data) => {
                    toast(`📩 Admin: ${data.message}`, { duration: 5000 });
                },
                onTimeWarning: (data) => {
                    const minutes = Math.floor(data.timeLeft / 60);
                    toast(`⏰ Time warning: ${minutes} minutes remaining!`, { duration: 5000 });
                },
                onAssessmentStatus: (data) => {
                    if (data.status === 'terminated') {
                        toast.error('Assessment terminated by administrator', { duration: 5000 });
                        submitAssessment(true);
                    }
                }
            });

            // Connect socket
            await socketService.connect(token, { role: 'candidate' });

        } catch (error) {
            console.error('Socket initialization failed:', error);
        }
    };
    // Initialize proctoring system
    const initializeProctoring = async () => {
        try {
            const proctoring = new ProctoringSystem();
            proctoringSystemRef.current = proctoring;

            // Set up callbacks
            proctoring.setCallbacks({
                onWarning: (violation) => {
                    // Update internal state from proctoring system's authoritative count
                    setWarnings(violation.warningCount);

                    setProctoringLogs(prev => [...prev, {
                        event: violation.type,
                        timestamp: violation.timestamp,
                        details: violation.message
                    }]);

                    // Show specific warning for violations
                    const remaining = Math.max(0, 3 - violation.warningCount);
                    const violationType = violation.type === 'tab_switch' ? 'Tab switch' :
                        violation.type === 'fullscreen_exit' ? 'Fullscreen exit' : 'Generic';

                    toast.error(`${violationType} violation! ${remaining} warning(s) remaining.`, {
                        duration: 4000,
                        position: 'top-center'
                    });

                    // Send proctoring alert via socket
                    if (socketConnected && assessmentId && userId) {
                        socketService.sendProctoringAlert(assessmentId, userId, {
                            type: violation.type,
                            message: violation.message,
                            warningCount: violation.warningCount,
                            tabSwitchCount: violation.tabSwitchCount,
                            fullscreenExitCount: violation.fullscreenExitCount
                        });
                    }
                },
                onTerminate: (data) => {
                    setWarnings(3);

                    toast.error(`Assessment terminated due to ${data.warnings} total violations. Submitting responses...`, {
                        duration: 5000,
                        position: 'top-center'
                    });

                    // Send termination alert via socket
                    if (socketConnected && assessmentId && userId) {
                        socketService.sendProctoringAlert(assessmentId, userId, {
                            type: 'termination',
                            message: `Assessment terminated due to ${data.warnings} violations`,
                            data: data
                        });
                    }

                    // Submit assessment immediately
                    submitAssessment(true);
                },
                onFullscreenToggle: (isFs) => {
                    setIsFullscreen(isFs);
                }
            });

            // Initialize with configuration
            await proctoring.initialize({
                enableWebcam: false,
                enableScreenMonitoring: true,
                maxWarnings: 3
            });

            setProctoringActive(true);
            setWebcamEnabled(false);

            // Initialize behavior analysis
            initializeBehaviorAnalysis();

        } catch (error) {
            console.error('Proctoring initialization failed:', error);
            toast.error('Proctoring system initialization failed');
        }
    };




    // Initialize behavior analysis
    const initializeBehaviorAnalysis = () => {
        try {
            const behaviorAnalysis = new BehaviorAnalysis();
            behaviorAnalysisRef.current = behaviorAnalysis;

            // Set up callbacks
            behaviorAnalysis.setCallbacks({
                onSuspiciousBehavior: (activity) => {
                    // Add to proctoring logs
                    setProctoringLogs(prev => [...prev, {
                        event: activity.type,
                        timestamp: activity.timestamp,
                        details: activity.message,
                        severity: activity.severity
                    }]);

                    // Send alert via socket
                    if (socketConnected && assessmentId && userId) {
                        socketService.sendProctoringAlert(assessmentId, userId, {
                            type: 'behavior_analysis',
                            message: activity.message,
                            severity: activity.severity,
                            data: activity
                        });
                    }

                    // Show warning for high severity
                    if (activity.severity === 'high') {
                        toast.error(`🧠 Behavior Alert: ${activity.message}`, { duration: 4000 });
                    }
                },
                onAnalysisUpdate: (analysis) => {
                    // Can be used to update UI with behavior analysis data
                    console.log('Behavior analysis update:', analysis);
                }
            });

            // Initialize with custom thresholds
            behaviorAnalysis.initialize({
                rapidClicks: 8,
                rapidTyping: 15,
                inactivityTime: 45000, // 45 seconds
                unusualMousePattern: 400,
                faceAwayTime: 3000
            });

            setBehaviorAnalysisActive(true);

        } catch (error) {
            console.error('Behavior analysis initialization failed:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            if (proctoringSystemRef.current) {
                proctoringSystemRef.current.stop();
            }
            if (behaviorAnalysisRef.current) {
                behaviorAnalysisRef.current.stop();
            }
            if (socketService.isConnected()) {
                socketService.leaveAssessment(assessmentId, userId, 'candidate');
                socketService.disconnect();
            }
        };
    }, [assessmentId, userId]);

    // Timer with warnings
    useEffect(() => {
        if (timeLeft === null) return;

        if (timeLeft <= 0) {
            submitAssessment();
            return;
        }

        // Time warnings
        if (timeLeft === 300 && !timeWarningsShown.current.fiveMin) {
            timeWarningsShown.current.fiveMin = true;
            toast('⏰ 5 minutes remaining!', {
                duration: 5000,
                style: { background: '#FEF3C7', color: '#92400E' }
            });
        } else if (timeLeft === 120 && !timeWarningsShown.current.twoMin) {
            timeWarningsShown.current.twoMin = true;
            toast('⚠️ 2 minutes remaining!', {
                duration: 5000,
                style: { background: '#FED7AA', color: '#9A3412' }
            });
        } else if (timeLeft === 30 && !timeWarningsShown.current.thirtySec) {
            timeWarningsShown.current.thirtySec = true;
            toast.error('🚨 30 seconds remaining!', { duration: 5000 });
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Auto-save function (debounced)
    const triggerAutoSave = useCallback(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        if (submittedRef.current) return;

        setAutoSaveStatus('saving');

        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                if (submittedRef.current) return;

                const answersArray = Object.entries(answers).map(([qId, optIdx]) => ({
                    questionId: qId,
                    selectedOption: optIdx,
                    timeSpent: questionTimesRef.current[qId] || 0
                }));

                await api.post('/assessments/auto-save', {
                    answers: answersArray,
                    markedForReview: Array.from(markedForReview),
                    proctoringLogs
                });

                if (submittedRef.current) return;
                setAutoSaveStatus('saved');
            } catch (err) {
                if (submittedRef.current) return;
                // If we get a 429, don't show error UI, just retry silently later
                if (err.response?.status === 429) {
                    console.warn('Auto-save throttled (429), will retry on next change');
                    return;
                }
                console.error('Auto-save failed:', err);
                setAutoSaveStatus('error');
            }
        }, 5000); // Increased debounce to 5 seconds to reduce server load in production
    }, [answers, markedForReview, proctoringLogs]);

    // Trigger auto-save when answers or marked questions change
    useEffect(() => {
        if (Object.keys(answers).length > 0 || markedForReview.size > 0) {
            triggerAutoSave();

            // Send progress update via socket
            if (socketConnected && assessmentId && userId) {
                const progress = {
                    answered: Object.keys(answers).length,
                    total: questions.length,
                    marked: markedForReview.size,
                    currentQuestion: currentQuestion + 1
                };
                socketService.sendProgressUpdate(assessmentId, userId, progress);
            }
        }
    }, [answers, markedForReview, triggerAutoSave, socketConnected, assessmentId, userId, currentQuestion, questions.length]);

    // Redundant listeners removed - ProctoringSystem handles these now

    // Unified violation handler (called by proctoring system or local triggers)
    const handleViolation = useCallback((type, message) => {
        // This is now primarily managed by the initializeProctoring callbacks
        // but kept for any specific UI triggers if needed
    }, []);

    const handleAnswer = (optionIndex) => {
        const qId = questions[currentQuestion]._id;
        setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    };

    const toggleMarkForReview = () => {
        const qId = questions[currentQuestion]._id;
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            if (newSet.has(qId)) {
                newSet.delete(qId);
            } else {
                newSet.add(qId);
            }
            return newSet;
        });
    };

    const initiateSubmit = () => {
        const unanswered = questions.length - Object.keys(answers).length;
        if (unanswered > 0) {
            setSubmitModalConfig({
                title: 'Review Submission',
                message: `You have ${unanswered} unanswered question(s). Are you sure you want to submit? You won't be able to change your answers later.`
            });
        } else {
            setSubmitModalConfig({
                title: 'Ready to Finish?',
                message: 'Are you sure you want to submit your assessment? This will finalize your results.'
            });
        }
        setShowSubmitModal(true);
    };

    const submitAssessment = async (force = false) => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        // Clear any pending auto-save timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Collect final proctoring logs directly from the system (not from stale state)
        let finalProctoringLogs = proctoringLogs;
        if (proctoringSystemRef.current) {
            const proctoringData = proctoringSystemRef.current.getProctoringData();
            finalProctoringLogs = proctoringData.events;
            proctoringSystemRef.current.stop();
        }

        if (behaviorAnalysisRef.current) {
            behaviorAnalysisRef.current.stop();
        }

        try {
            // Flush time for the current question before submitting
            if (questions.length > 0 && currentQuestion < questions.length) {
                const currentQId = questions[currentQuestion]?._id;
                if (currentQId) {
                    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
                    questionTimesRef.current[currentQId] = (questionTimesRef.current[currentQId] || 0) + elapsed;
                }
            }

            const payload = Object.entries(answers).map(([qId, optIdx]) => ({
                questionId: qId,
                selectedOption: optIdx,
                timeSpent: questionTimesRef.current[qId] || 0
            }));

            await api.post('/assessments/submit', {
                answers: payload,
                proctoringLogs: finalProctoringLogs
            });

            navigate('/assessment/thank-you', { replace: true });
        } catch (err) {
            console.error(err);
            submittedRef.current = false;
            toast.error('Submission Failed. Please try again.');
        }
    };

    const getQuestionStatus = (qId) => {
        if (answers[qId] !== undefined) return 'answered';
        if (markedForReview.has(qId)) return 'marked';
        return 'unanswered';
    };

    // Render Loading State
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E11D48] mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700">Loading Assessment...</h2>
            </div>
        </div>
    );

    // Render Expired State
    if (timeLeft !== null && timeLeft <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                    <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Ended</h2>
                    <p className="text-gray-600 mb-6">The time for this assessment has expired.</p>
                </div>
            </div>
        );
    }

    // Render Empty State
    if (!questions || questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                    <AlertOctagon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Questions Found</h2>
                    <p className="text-gray-600 mb-6">There are no questions uploaded for this assessment drive yet.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedForReview.size;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeLeft < 60) return 'bg-red-100 text-red-600';
        if (timeLeft < 300) return 'bg-yellow-100 text-yellow-700';
        return 'bg-[#E11D48]/5 text-[#E11D48]';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md shadow-sm p-4 flex flex-wrap md:flex-nowrap justify-between items-center sticky top-0 z-20 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-4 md:space-x-8">
                    <div className="flex items-center space-x-3 transition-transform hover:scale-105 duration-300">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-[#E11D48] italic tracking-tighter uppercase leading-none">SHORTLISTO</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mt-0.5">Assessment</span>
                        </div>
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-slate-100 mx-2"></div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm md:text-lg font-black tracking-tight text-slate-800 leading-tight">
                            {meta?.drive?.name ? meta.drive.name : 'Assessment'}
                        </h1>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">LIVE ENVIRONMENT</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    {/* Compact Status for Mobile */}
                    <div className="md:hidden flex items-center space-x-2 mr-1 sm:mr-2">
                        <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500'} shadow-sm`}></div>
                        <div className={`w-2 h-2 rounded-full ${autoSaveStatus === 'saved' ? 'bg-rose-500' : autoSaveStatus === 'saving' ? 'bg-rose-400 animate-pulse' : 'bg-rose-500'}`}></div>
                    </div>

                    {/* Status badges - Desktop */}
                    <div className="hidden lg:flex items-center space-x-3 mr-4">
                        <div className="flex items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {autoSaveStatus === 'saving' && <Save size={12} className="mr-2 animate-spin text-[#E11D48]" />}
                            {autoSaveStatus === 'saved' && <CheckCircle size={12} className="mr-2 text-emerald-500" />}
                            {autoSaveStatus === 'error' && <AlertTriangle size={12} className="mr-2 text-rose-500" />}
                            {autoSaveStatus}
                        </div>
                        <div className="w-px h-4 bg-slate-100 mx-1"></div>
                        <div className={`flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${warnings > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            <AlertTriangle size={12} className="mr-2" />
                            Warnings: {warnings}/3
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-3 mr-4">
                        <div className={`flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${socketConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                            {socketConnected ? <Wifi size={14} className="mr-2" /> : <WifiOff size={14} className="mr-2" />}
                            System Ready
                        </div>
                    </div>

                    <div className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black text-base sm:text-lg shadow-sm border ${timeLeft < 60 ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50 animate-pulse' : 'bg-[#E11D48]/5 text-[#E11D48] border-rose-100 shadow-rose-50'} transition-all duration-500`}>
                        <Clock size={16} className="sm:w-5 sm:h-5" />
                        <span className="tabular-nums tracking-tighter">{formatTime(timeLeft || 0)}</span>
                    </div>

                    <button
                        onClick={initiateSubmit}
                        className="group flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-black transition-all duration-300 shadow-lg shadow-slate-200 active:scale-95 ml-2"
                    >
                        <Shield size={16} className="group-hover:rotate-12 transition-transform" />
                        <span className="hidden sm:inline">Submit Test</span>
                        <span className="sm:hidden">Submit</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10 max-w-7xl relative z-10">
                {/* Question Palette Sidebar - Desktop Sidebar / Mobile Drawer */}
                <div className={`
                    bg-white rounded-[32px] shadow-xl shadow-rose-100/20 p-6 border border-slate-50 transition-all duration-500 h-fit
                    ${showQuestionPalette 
                        ? 'fixed inset-x-4 bottom-4 top-24 z-50 md:sticky md:top-28 md:w-72' 
                        : 'w-20 sticky top-28 hidden md:block'}
                `}>
                    <div className="flex items-center justify-between mb-6 md:block">
                        <button
                            onClick={() => setShowQuestionPalette(!showQuestionPalette)}
                            className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${showQuestionPalette ? 'bg-[#E11D48] text-white shadow-lg shadow-rose-100 w-full md:mb-6' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 w-full'}`}
                        >
                            <Grid3x3 size={24} />
                            {showQuestionPalette && <span className="ml-3 text-[11px] font-black uppercase tracking-widest">Question Map</span>}
                        </button>
                        
                        {/* Mobile close button for palette */}
                        {showQuestionPalette && (
                            <button 
                                onClick={() => setShowQuestionPalette(false)}
                                className="md:hidden p-2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {showQuestionPalette && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 overflow-y-auto max-h-[calc(100vh-250px)] md:max-h-none custom-scrollbar">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 gap-3 mb-8">
                                {questions.map((q, idx) => {
                                    const status = getQuestionStatus(q._id);
                                    let styles = 'bg-slate-50 text-slate-400 border-slate-100';
                                    if (status === 'answered') styles = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100';
                                    else if (status === 'marked') styles = 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-100';
                                    
                                    if (currentQuestion === idx) styles += ' ring-2 ring-[#E11D48] ring-offset-2';

                                    return (
                                        <button
                                            key={q._id}
                                            onClick={() => setCurrentQuestion(idx)}
                                            className={`h-10 rounded-xl text-xs font-black transition-all transform active:scale-95 border ${styles}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-50">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#E11D48] h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Area */}
                <div className="flex-1 max-w-3xl">
                    <div className="bg-white rounded-[40px] shadow-2xl shadow-rose-100/40 p-8 md:p-14 min-h-[500px] flex flex-col border border-slate-50 transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 relative overflow-hidden">
                        {/* Status bar top */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#E11D48] to-[#6B63FF] opacity-80"></div>
                        
                        <div className="flex justify-between items-center mb-12">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-pulse"></span>
                                    <span className="text-[10px] font-black text-[#E11D48] uppercase tracking-[0.3em]">In Execution</span>
                                </div>
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    Question {currentQuestion + 1} of {questions.length}
                                </h3>
                            </div>
                            <button
                                onClick={toggleMarkForReview}
                                className={`flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 transform active:scale-95 ${markedForReview.has(question._id)
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-rose-200 hover:text-rose-500'
                                    }`}
                            >
                                <Flag size={14} className={`mr-2 ${markedForReview.has(question._id) ? 'fill-current' : ''}`} />
                                {markedForReview.has(question._id) ? 'Review Marked' : 'Mark Review'}
                            </button>
                        </div>

                        <h2 className="text-xl md:text-3xl font-black text-slate-800 mb-14 leading-tight tracking-tight">
                            {question.question}
                        </h2>

                        <div className="space-y-4 flex-1">
                            {question.options.map((opt, idx) => {
                                const isSelected = answers[question._id] === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        className={`w-full group text-left p-6 rounded-[24px] transition-all duration-300 border-2 select-none active:scale-[0.99] ${isSelected
                                            ? 'border-[#E11D48] bg-[#E11D48]/5 text-[#E11D48] shadow-lg shadow-rose-100/30'
                                            : 'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-rose-100 hover:bg-white hover:text-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-5 font-black text-xs transition-all duration-300 ${isSelected ? 'bg-[#E11D48] text-white shadow-md shadow-rose-200' : 'bg-white text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 border border-slate-100'}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="text-sm md:text-base font-bold">{opt}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-100 gap-4 sm:gap-6">
                            <button
                                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestion === 0}
                                className={`w-full sm:w-auto flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all px-6 py-4 rounded-2xl border border-transparent hover:border-slate-100 ${currentQuestion === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-[#E11D48]'}`}
                            >
                                <ChevronLeft size={16} /> Previous Problem
                            </button>

                            {currentQuestion === questions.length - 1 ? (
                                <button
                                    onClick={() => initiateSubmit()}
                                    className="w-full sm:w-auto bg-emerald-500 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-emerald-600 shadow-xl shadow-emerald-100 transition-all transform active:scale-95"
                                >
                                    Final Submission
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="w-full sm:w-auto bg-[#E11D48] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-[#3d35b8] shadow-xl shadow-rose-100 transition-all transform active:scale-95"
                                >
                                    Next Problem →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Required Overlay */}
            {!isFullscreen && !loading && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
                    <div className="bg-white rounded-[40px] shadow-2xl p-10 md:p-14 max-w-lg w-full transform transition-all border border-slate-100">
                        <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-100 shadow-xl shadow-rose-100/20">
                            <Monitor className="text-rose-500" size={40} />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-4">Integrity Check</h2>
                        <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10">
                            To maintain evaluation integrity, you must remain in fullscreen mode.
                            Exiting will count as a violation towards your limit.
                        </p>
                        <button
                            onClick={() => {
                                const elem = document.documentElement;
                                if (elem.requestFullscreen) {
                                    elem.requestFullscreen().catch(err => console.log(err));
                                } else if (elem.webkitRequestFullscreen) {
                                    elem.webkitRequestFullscreen();
                                }
                            }}
                            className="w-full py-5 bg-[#E11D48] text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#3d35b8] shadow-xl shadow-rose-100 transition-all active:scale-95"
                        >
                            Return to Environment
                        </button>
                        <div className="mt-8 flex items-center justify-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                             <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                {3 - warnings} violations remaining
                             </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center p-8 relative z-10">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Shortlisto Secure Assessment Protocol Active</p>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onConfirm={() => {
                    setShowSubmitModal(false);
                    submitAssessment();
                }}
                title={submitModalConfig.title}
                message={submitModalConfig.message}
            />

            {/* Floating Mobile Toggle for Question Map */}
            {!showQuestionPalette && (
                <button
                    onClick={() => setShowQuestionPalette(true)}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-[#E11D48] text-white p-4 rounded-2xl shadow-2xl shadow-rose-200 animate-in fade-in zoom-in duration-300"
                >
                    <Grid3x3 size={24} />
                </button>
            )}
        </div>
    );
};

export default Assessment;
