import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Papa from 'papaparse';
import { Upload, Plus, CheckCircle, AlertTriangle, X, FileText, ListChecks, Database, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

const QuestionUpload = () => {
    const { isDark } = useTheme();
    const [drives, setDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState('');
    const [activeTab, setActiveTab] = useState('manual');

    const [manualForm, setManualForm] = useState({
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        correctAnswer: 0
    });

    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [uploadStatus, setUploadStatus] = useState('');

    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);

    const [errorModal, setErrorModal] = useState({ show: false, message: '', title: 'Error' });
    const [warningModal, setWarningModal] = useState({ show: false, message: '', title: 'Warning' });

    useEffect(() => {
        const fetchDrives = async () => {
            try {
                const res = await api.get('/drives');
                setDrives(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error(err);
                toast.error('Sync failed');
            }
        };
        fetchDrives();
    }, []);

    const fetchQuestions = async (driveId) => {
        if (!driveId) {
            setQuestions([]);
            return;
        }
        setIsLoadingQuestions(true);
        try {
            const res = await api.get(`/questions/drive/${driveId}?t=${Date.now()}`);
            setQuestions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load questions');
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    useEffect(() => {
        if (selectedDrive && activeTab === 'manage') {
            fetchQuestions(selectedDrive);
        } else if (!selectedDrive) {
            setQuestions([]);
        }
    }, [selectedDrive, activeTab]);

    const handleManualChange = e => setManualForm({ ...manualForm, [e.target.name]: e.target.value });

    const handleManualSubmit = async e => {
        e.preventDefault();
        if (!selectedDrive) {
            setWarningModal({
                show: true,
                title: 'No Assessment selected',
                message: 'Target drive must be selected before question upload.'
            });
            return;
        }

        const questionData = {
            question: manualForm.question,
            options: [manualForm.option1, manualForm.option2, manualForm.option3, manualForm.option4],
            correctAnswer: manualForm.correctAnswer,
            driveId: selectedDrive
        };

        try {
            await api.post('/questions', questionData);
            toast.success('Node deployed');
            setManualForm({ question: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: 0 });
            fetchQuestions(selectedDrive); // Refresh list
        } catch (err) {
            console.error(err);
            toast.error('Deployment failed');
        }
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        try {
            const updateData = {
                question: editingQuestion.question,
                options: editingQuestion.options,
                correctAnswer: editingQuestion.correctAnswer
            };
            await api.patch(`/questions/${editingQuestion._id}`, updateData);
            toast.success('Question updated');
            setEditingQuestion(null);
            fetchQuestions(selectedDrive);
        } catch (err) {
            console.error(err);
            toast.error('Update failed');
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            await api.delete(`/questions/${id}`);
            toast.success('Question removed');
            fetchQuestions(selectedDrive);
        } catch (err) {
            console.error(err);
            toast.error('Deletion failed');
        }
    };

    const handleCsvUpload = e => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
            complete: (results) => {
                const questions = results.data
                    .filter(row => row.question && row.option1)
                    .map(row => {
                        const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean);
                        let ca = 0;

                        if (row.correctAnswer !== undefined && row.correctAnswer !== null && row.correctAnswer !== '') {
                            const answerStr = row.correctAnswer.toString().trim();
                            const parsed = parseInt(answerStr);

                            if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
                                ca = parsed - 1;
                            } else {
                                const matchIndex = options.findIndex(opt =>
                                    opt && opt.toString().trim().toLowerCase() === answerStr.toLowerCase()
                                );
                                if (matchIndex !== -1) {
                                    ca = matchIndex;
                                }
                            }
                        }

                        return {
                            question: row.question,
                            options: options,
                            correctAnswer: ca
                        };
                    });

                if (questions.length === 0) {
                    setErrorModal({
                        show: true,
                        title: 'Format_Violation',
                        message: 'No valid nodes discovered in the data stream. Verify header integrity: question, option1-4, correctAnswer.'
                    });
                    setParsedQuestions([]);
                } else {
                    setParsedQuestions(questions);
                    toast.success(`Stream scanned: ${questions.length} questions`);
                }
            },
            error: (err) => {
                setErrorModal({ show: true, title: 'Parsing_Error', message: `Data corruption: ${err.message}` });
            }
        });
    };

    const submitCsvQuestions = async () => {
        if (!selectedDrive) {
            setWarningModal({
                show: true,
                title: 'No Drives selected',
                message: 'Target drive must be selected before bulk upload.'
            });
            return;
        }

        if (parsedQuestions.length === 0) {
            setWarningModal({
                show: true,
                title: 'No_Buffer',
                message: 'Empty question buffer. Initialize stream first.'
            });
            return;
        }

        try {
            setUploadStatus('uploading');
            await api.post('/questions/bulk', {
                questions: parsedQuestions,
                driveId: selectedDrive
            });
            setUploadStatus('success');
            setParsedQuestions([]);
            toast.success('Question Uploaded successfully');
            fetchQuestions(selectedDrive); // Added refresh after bulk upload
        } catch (err) {
            console.error(err);
            setUploadStatus('error');
            setErrorModal({
                show: true,
                title: 'Upload_failure',
                message: 'System failed to upload the question upload. Buffer clear recommended.'
            });
        }
    };

    const closeErrorModal = () => setErrorModal({ ...errorModal, show: false });
    const closeWarningModal = () => setWarningModal({ ...warningModal, show: false });


    // Theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const inputCls = isDark ? 'bg-white/5 border-white/8 text-white placeholder:text-white/20 focus:border-rose-500/60 focus:ring-rose-500/20' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-400 focus:ring-rose-400/20';
    const selectCls = isDark ? 'bg-white/5 border-white/8 text-white focus:border-rose-500/60' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400';
    const tabActive = isDark ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm';
    const tabInactive = isDark ? 'text-white/40 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const skel = isDark ? 'bg-white/5' : 'bg-gray-100';
    const optionCard = (isSelected) => isDark
        ? isSelected ? 'border-rose-500 bg-rose-500/10' : 'border-white/8 bg-white/[0.03] hover:border-white/15'
        : isSelected ? 'border-rose-400 bg-rose-50' : 'border-gray-200 bg-white hover:border-gray-300';
    const optionCorrect = isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-400 bg-emerald-50';
    const optionWrong = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-200 bg-gray-50';
    const iconBtn = isDark ? 'text-white/30 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50';
    const iconBtnDanger = isDark ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const modalBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const modalHdr = isDark ? 'border-white/8 bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50';
    const overlay = 'bg-black/50 backdrop-blur-sm';
    const confirmDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const uploadZone = isDark ? 'border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5' : 'border-gray-200 hover:border-rose-400 hover:bg-rose-50/30';
    const qCard = isDark ? 'bg-white/[0.03] border-white/8 hover:border-white/15' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm';
    const qText = isDark ? 'text-white/80' : 'text-gray-800';
    const metaBadge = isDark ? 'bg-white/8 text-white/40' : 'bg-gray-100 text-gray-500';
    const setBtnCls = (isCorrect) => isDark
        ? isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/8 text-white/40 hover:bg-white/12'
        : isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200';

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-5 ${card}`}>
                <div>
                    <h2 className={`text-xl font-bold ${h1}`}>Questions</h2>
                    <p className={`text-[12px] mt-0.5 ${muted}`}>Add and manage questions for your assessment drives</p>
                </div>
                <div className="w-full sm:w-64">
                    <select value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${selectCls}`}>
                        <option value="">Select Drive</option>
                        {drives.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1.5 border rounded-xl ${card}`}>
                {[
                    { id: 'manual', label: 'Manual Entry', icon: FileText },
                    { id: 'csv', label: 'Bulk Upload', icon: Upload },
                    { id: 'manage', label: 'Manage Questions', icon: Database },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all ${activeTab === tab.id ? tabActive : tabInactive}`}>
                        <tab.icon size={14} /><span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                        <FileText size={13} className="text-emerald-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Add Question Manually</span>
                    </div>
                    <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
                        <div>
                            <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Question</label>
                            <textarea name="question" value={manualForm.question} onChange={handleManualChange} required
                                placeholder="Enter your question here..."
                                className={`w-full px-3.5 py-3 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all min-h-[100px] resize-none ${inputCls}`} />
                        </div>
                        <div>
                            <label className={`block text-[11px] font-semibold mb-2 ${muted}`}>Options — click to mark correct answer</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map((num, idx) => (
                                    <div key={num} onClick={() => setManualForm({ ...manualForm, correctAnswer: idx })}
                                        className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${optionCard(manualForm.correctAnswer === idx)}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[12px] flex-shrink-0 transition-all ${manualForm.correctAnswer === idx ? 'bg-rose-500 text-white' : isDark ? 'bg-white/8 text-white/40' : 'bg-gray-100 text-gray-500'}`}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <input type="text" name={`option${num}`} value={manualForm[`option${num}`]} onChange={handleManualChange}
                                            onClick={e => e.stopPropagation()}
                                            className={`flex-1 bg-transparent border-none outline-none text-[13px] font-medium ${h1} placeholder:${muted}`}
                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`} required />
                                        {manualForm.correctAnswer === idx && <CheckCircle size={15} className="text-rose-500 flex-shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit"
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[13px] font-semibold hover:bg-emerald-600 transition-all active:scale-95 shadow-sm shadow-emerald-500/20">
                                <Plus size={15} /> Add Question
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CSV Upload Tab */}
            {activeTab === 'csv' && (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                        <Upload size={13} className="text-blue-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Bulk Upload via CSV</span>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group ${uploadZone}`}>
                            <input type="file" accept=".csv" onChange={handleCsvUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border transition-all group-hover:scale-110 ${isDark ? 'bg-white/5 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
                                <Upload size={20} className={`${muted} group-hover:text-rose-500 transition-colors`} />
                            </div>
                            <p className={`text-[13px] font-semibold ${h1}`}>Drop your CSV file here</p>
                            <p className={`text-[12px] mt-1 ${muted}`}>or click to browse</p>
                            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg border text-[11px] ${isDark ? 'bg-white/5 border-white/8 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                Required columns: <code className="font-mono">question, option1, option2, option3, option4, correctAnswer</code>
                            </div>
                        </div>

                        {parsedQuestions.length > 0 && (
                            <div className={`flex items-center justify-between p-4 border rounded-xl ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center"><ListChecks size={18} className="text-white" /></div>
                                    <div>
                                        <p className={`text-[13px] font-semibold ${h1}`}>{parsedQuestions.length} questions ready</p>
                                        <p className="text-[11px] text-emerald-500">Parsed and verified</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setParsedQuestions([])} className={`p-2 rounded-lg transition-all ${iconBtnDanger}`}><X size={14} /></button>
                                    <button onClick={submitCsvQuestions} disabled={uploadStatus === 'uploading'}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[12px] font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50">
                                        {uploadStatus === 'uploading' ? <><Loader2 size={13} className="animate-spin" /><span>Uploading...</span></> : <><CheckCircle size={13} /><span>Upload All</span></>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Questions Tab */}
            {activeTab === 'manage' && (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-6 py-3.5 border-b flex items-center justify-between ${sectionHdr}`}>
                        <div className="flex items-center gap-2">
                            <Database size={13} className="text-rose-500" />
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Question Bank</span>
                            {questions.length > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{questions.length}</span>}
                        </div>
                        {isLoadingQuestions && <Loader2 className="animate-spin text-rose-500" size={13} />}
                    </div>
                    <div className="p-6">
                        {!selectedDrive ? (
                            <div className="py-16 text-center">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><Search size={20} /></div>
                                <p className={`text-[13px] font-semibold ${h1}`}>Select a drive</p>
                                <p className={`text-[12px] mt-1 ${muted}`}>Choose a drive from the dropdown above to view its questions</p>
                            </div>
                        ) : isLoadingQuestions ? (
                            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className={`h-20 rounded-xl animate-pulse ${skel}`} />)}</div>
                        ) : questions.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><Plus size={20} /></div>
                                <p className={`text-[13px] font-semibold ${h1}`}>No questions yet</p>
                                <p className={`text-[12px] mt-1 ${muted}`}>Add questions using Manual Entry or Bulk Upload</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((q, idx) => (
                                    <div key={q._id} className={`border rounded-xl p-4 transition-all ${qCard}`}>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>
                                                <p className={`text-[13px] font-medium ${qText} leading-snug`}>{q.question}</p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button onClick={() => setEditingQuestion(q)} className={`p-1.5 rounded-lg transition-all ${iconBtn}`} title="Edit"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteQuestion(q._id)} className={`p-1.5 rounded-lg transition-all ${iconBtnDanger}`} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 ml-9">
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className={`px-3 py-2 rounded-lg border text-[11px] font-medium flex items-center gap-2 ${optIdx === q.correctAnswer ? optionCorrect : optionWrong}`}>
                                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${optIdx === q.correctAnswer ? 'bg-emerald-500 text-white' : isDark ? 'bg-white/8 text-white/40' : 'bg-gray-200 text-gray-500'}`}>{String.fromCharCode(65 + optIdx)}</span>
                                                    <span className={optIdx === q.correctAnswer ? 'text-emerald-600' : muted}>{opt}</span>
                                                    {optIdx === q.correctAnswer && <CheckCircle size={12} className="text-emerald-500 ml-auto flex-shrink-0" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Question Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={() => setEditingQuestion(null)} />
                    <div className={`relative z-10 w-full max-w-lg rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col ${modalBg}`}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between flex-shrink-0 ${modalHdr}`}>
                            <div>
                                <h3 className={`text-[16px] font-bold ${h1}`}>Edit Question</h3>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>Update question and options</p>
                            </div>
                            <button onClick={() => setEditingQuestion(null)} className={`p-2 rounded-lg transition-all ${iconBtn}`}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleUpdateQuestion} className="overflow-y-auto flex-1 p-6 space-y-5">
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Question</label>
                                <textarea value={editingQuestion.question}
                                    onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                                    className={`w-full px-3.5 py-3 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all min-h-[90px] resize-none ${inputCls}`} required />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold mb-2 ${muted}`}>Options</label>
                                <div className="space-y-2">
                                    {editingQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <button type="button" onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: idx })}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${setBtnCls(editingQuestion.correctAnswer === idx)}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </button>
                                            <input type="text" value={opt}
                                                onChange={e => { const opts = [...editingQuestion.options]; opts[idx] = e.target.value; setEditingQuestion({ ...editingQuestion, options: opts }); }}
                                                className={`flex-1 px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${editingQuestion.correctAnswer === idx ? (isDark ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-emerald-400 bg-emerald-50 text-emerald-700') : inputCls}`}
                                                required />
                                        </div>
                                    ))}
                                </div>
                                <p className={`text-[11px] mt-2 ${muted}`}>Click the letter button to mark the correct answer</p>
                            </div>
                            <div className={`pt-4 border-t flex justify-end gap-3 ${confirmDivider}`}>
                                <button type="button" onClick={() => setEditingQuestion(null)}
                                    className={`px-5 py-2.5 border rounded-xl text-[13px] font-medium transition-all ${isDark ? 'border-white/8 text-white/40 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Cancel</button>
                                <button type="submit"
                                    className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all shadow-sm shadow-rose-500/20">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Error/Warning Modals */}
            {errorModal.show && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={closeErrorModal} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100"><AlertTriangle className="text-red-500" size={22} /></div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>{errorModal.title}</h3>
                            <p className={`text-[13px] ${muted}`}>{errorModal.message}</p>
                        </div>
                        <div className={`border-t ${confirmDivider}`}>
                            <button onClick={closeErrorModal} className="w-full py-3.5 text-[12px] font-semibold text-rose-500 hover:bg-rose-50 transition-all">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
            {warningModal.show && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={closeWarningModal} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-100"><AlertTriangle className="text-amber-500" size={22} /></div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>{warningModal.title}</h3>
                            <p className={`text-[13px] ${muted}`}>{warningModal.message}</p>
                        </div>
                        <div className={`border-t ${confirmDivider}`}>
                            <button onClick={closeWarningModal} className="w-full py-3.5 text-[12px] font-semibold text-amber-500 hover:bg-amber-50 transition-all">Got it</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionUpload;
