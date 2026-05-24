import React, { useState, useMemo } from 'react';
import api from '../../utils/api';
import { Search, AlertTriangle, Award, Shield, X, BarChart3, Loader2, Users, ListChecks } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TableRowSkeleton } from '../../components/Skeleton';
import useFilters from '../../hooks/useFilters';
import usePagination from '../../hooks/usePagination';
import FilterPanel from '../../components/FilterPanel';
import FilterChips from '../../components/FilterChips';
import PaginationFooter from '../../components/PaginationFooter';
import { useTheme } from '../../context/ThemeContext';

const Results = () => {
    const { isDark } = useTheme();
    const [selectedResultId, setSelectedResultId] = useState(null);

    // Discrete Pagination & Filtering Hooks
    const { page, limit, setPage, setLimit } = usePagination(20);
    const { filters, setFilter, clearFilters, debouncedSearch } = useFilters({
        driveId: '',
        minScore: '',
        maxScore: ''
    });

    // Fetch Drives for the selector
    const { data: drivesData = [] } = useQuery({
        queryKey: ['drives-list'],
        queryFn: async () => {
            const res = await api.get('/drives');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: false
    });

    const {
        data,
        isLoading
    } = useQuery({
        queryKey: ['results', debouncedSearch, page, limit, filters],
        queryFn: async () => {
            const res = await api.get('/results', {
                params: {
                    page,
                    limit,
                    search: debouncedSearch,
                    ...filters
                }
            });
            return res.data;
        },
        keepPreviousData: true
    });

    const results = data?.results || [];
    const totalResults = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    const { data: selectedResult, isLoading: loadingResult } = useQuery({
        queryKey: ['result-details', selectedResultId],
        queryFn: async () => {
            const res = await api.get(`/results/${selectedResultId}`);
            return res.data;
        },
        enabled: !!selectedResultId
    });

    // Fetch questions for drive details in modal
    const { data: driveQuestions } = useQuery({
        queryKey: ['drive-questions', selectedResult?.drive?._id],
        queryFn: async () => {
            const res = await api.get(`/questions/drive/${selectedResult.drive._id}`);
            return res.data;
        },
        enabled: !!selectedResult?.drive?._id
    });

    const cleanRecords = useMemo(() => {
        return results.filter(r => !r.proctoringLogs || r.proctoringLogs.length === 0).length;
    }, [results]);

    const getScoreColor = (score, max) => {
        if (!max) return 'text-white/30';
        const pct = (score / max) * 100;
        if (pct >= 80) return 'text-emerald-600 font-bold';
        if (pct >= 50) return 'text-amber-600 font-medium';
        return 'text-red-400 font-medium';
    };

    const filterConfigs = [
        {
            id: 'driveId',
            label: 'Drive',
            type: 'select',
            options: drivesData.map(d => ({ value: d._id, label: `${d.name} (${d.university})` }))
        },
        {
            id: 'score',
            label: 'Score Range',
            type: 'range'
        },
        {
            id: 'hasFlags',
            label: 'Proctoring',
            type: 'select',
            options: [
                { value: 'false', label: 'Verified Only' },
                { value: 'true', label: 'Flagged Only' }
            ]
        }
    ];

    const labels = {
        driveId: 'Drive',
        score: 'Score',
        hasFlags: 'Proctoring',
        minScore: 'Min Score',
        maxScore: 'Max Score',
        search: 'Search'
    };


    // Theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const tblHdr = isDark ? 'bg-white/[0.02] text-white/30' : 'bg-gray-50 text-gray-500';
    const tblDivide = isDark ? 'divide-white/5' : 'divide-gray-100';
    const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50';
    const skel = isDark ? 'bg-white/5' : 'bg-gray-100';
    const inputCls = isDark ? 'bg-white/5 border-white/8 text-white placeholder:text-white/20 focus:border-rose-500/60 focus:ring-rose-500/20' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-400 focus:ring-rose-400/20';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const modalBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const modalHdr = isDark ? 'border-white/8 bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50';
    const overlay = 'bg-black/50 backdrop-blur-sm';
    const iconBtn = isDark ? 'text-white/30 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50';
    const avatarBg = isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500';
    const filterBarBg = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const statCard = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const inlineCard = isDark ? 'bg-white/[0.03] border-white/8' : 'bg-gray-50 border-gray-100';


    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`border rounded-2xl p-5 ${card}`}>
                <h2 className={`text-xl font-bold ${h1}`}>Results</h2>
                <p className={`text-[12px] mt-0.5 ${muted}`}>Assessment performance and integrity audit</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Attempted', val: totalResults, icon: Users, color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
                    { label: 'Avg Score', val: results.length > 0 ? (results.reduce((s, r) => s + (r.maxScore ? (r.totalScore / r.maxScore) * 100 : 0), 0) / results.length).toFixed(1) + '%' : '0%', icon: Award, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
                    { label: 'Clean Records', val: cleanRecords, icon: Shield, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
                    { label: 'Flagged', val: totalResults - cleanRecords, icon: AlertTriangle, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
                ].map((s, i) => (
                    <div key={i} className={`border rounded-2xl p-5 ${statCard}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                            <s.icon size={17} className={s.color} />
                        </div>
                        <p className={`text-[11px] font-medium ${muted} mb-0.5`}>{s.label}</p>
                        <h3 className={`text-2xl font-bold ${h1}`}>{s.val}</h3>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className={`flex flex-col md:flex-row md:items-center gap-3 border rounded-2xl p-4 ${filterBarBg}`}>
                <div className="relative flex-1">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                    <input type="text" placeholder="Search by candidate name or email..."
                        className={`w-full pl-9 pr-4 py-2 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 transition-all ${inputCls}`}
                        value={filters.search || ''} onChange={e => setFilter('search', e.target.value)} />
                </div>
                <FilterPanel filters={filters} setFilter={setFilter} onClear={clearFilters} filterConfigs={filterConfigs} />
            </div>

            <FilterChips filters={filters} setFilter={setFilter} onClear={clearFilters} labels={labels} />

            {/* Table */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                    <BarChart3 size={13} className="text-rose-500" />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>All Results</span>
                    {totalResults > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{totalResults}</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${tblDivide}`}>
                        <thead>
                            <tr className={tblHdr}>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Assessment</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Integrity</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Submitted</th>
                                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${tblDivide}`}>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                            ) : results.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><BarChart3 size={20} /></div>
                                        <p className={`text-[13px] font-semibold ${h1}`}>No results found</p>
                                        <p className={`text-[12px] mt-1 ${muted}`}>Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                results.map((result) => (
                                    <tr key={result._id} className={`transition-all duration-150 group cursor-default ${rowHover}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0 ${avatarBg}`}>
                                                    {result.candidate?.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors`}>{result.candidate?.name}</p>
                                                    <p className={`text-[11px] ${muted}`}>{result.candidate?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-[13px] font-medium ${h1}`}>{result.drive?.name || '—'}</p>
                                            <p className={`text-[11px] ${muted}`}>{result.drive?.university || 'General'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[18px] font-bold ${getScoreColor(result.totalScore, result.maxScore)}`}>
                                                {result.totalScore}
                                            </span>
                                            <span className={`text-[12px] ${muted} ml-1`}>/ {result.maxScore || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {result.proctoringLogs?.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold uppercase tracking-wide border border-red-100">
                                                    <AlertTriangle size={11} /> {result.proctoringLogs.length} Flags
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wide border border-emerald-100">
                                                    <Shield size={11} /> Verified
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-[12px] font-medium ${h1}`}>{new Date(result.submittedAt).toLocaleDateString()}</p>
                                            <p className={`text-[11px] ${muted}`}>{new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setSelectedResultId(result._id)}
                                                className={`px-3.5 py-1.5 border rounded-lg text-[12px] font-medium transition-all ${isDark ? 'border-white/8 text-white/50 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationFooter pagination={{ page, limit, total: totalResults, totalPages }} onPageChange={setPage} onLimitChange={setLimit} />
            </div>

            {/* Result Detail Modal */}
            {selectedResultId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={() => setSelectedResultId(null)} />
                    <div className={`relative z-10 w-full max-w-4xl rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col ${modalBg}`}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between flex-shrink-0 ${modalHdr}`}>
                            <div>
                                <h3 className={`text-[16px] font-bold ${h1}`}>Result Detail</h3>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>{selectedResult?.candidate?.name} · ID: {selectedResult?._id?.slice(-8)}</p>
                            </div>
                            <button onClick={() => setSelectedResultId(null)} className={`p-2 rounded-lg transition-all ${iconBtn}`}><X size={16} /></button>
                        </div>

                        {loadingResult ? (
                            <div className="flex-1 flex items-center justify-center p-16">
                                <Loader2 className="animate-spin text-rose-500" size={28} />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Summary row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className={`border rounded-xl p-4 ${inlineCard}`}>
                                        <p className={`text-[11px] font-medium ${muted} mb-1`}>Total Score</p>
                                        <p className={`text-3xl font-bold ${h1}`}>{selectedResult?.totalScore}<span className={`text-[14px] ${muted} ml-1`}>/ {selectedResult?.maxScore || 0}</span></p>
                                    </div>
                                    <div className={`border rounded-xl p-4 ${selectedResult?.proctoringLogs?.length > 0 ? (isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100') : (isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')}`}>
                                        <p className={`text-[11px] font-medium ${muted} mb-1`}>Integrity</p>
                                        <p className={`text-2xl font-bold ${selectedResult?.proctoringLogs?.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {selectedResult?.proctoringLogs?.length > 0 ? 'FLAGGED' : 'VERIFIED'}
                                        </p>
                                    </div>
                                    <div className={`border rounded-xl p-4 ${inlineCard}`}>
                                        <p className={`text-[11px] font-medium ${muted} mb-1`}>Time Spent</p>
                                        <p className={`text-2xl font-bold ${h1}`}>
                                            {Math.floor((selectedResult?.answers?.reduce((s, a) => s + (a.timeSpent || 0), 0) || 0) / 60)}m {(selectedResult?.answers?.reduce((s, a) => s + (a.timeSpent || 0), 0) || 0) % 60}s
                                        </p>
                                    </div>
                                </div>

                                {/* Response audit */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ListChecks size={14} className="text-rose-500" />
                                        <h4 className={`text-[12px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Response Audit</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {driveQuestions?.map((question, i) => {
                                            const ans = selectedResult?.answers?.find(a => a.question?._id === question._id || a.question === question._id);
                                            const isAnswered = ans && ans.selectedOption !== null && ans.selectedOption !== undefined;
                                            const isCorrect = isAnswered && ans.selectedOption === question.correctAnswer;
                                            return (
                                                <div key={question._id} className={`border rounded-xl p-4 ${card}`}>
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex items-start gap-2 flex-1">
                                                            <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {isAnswered ? (
                                                                        isCorrect
                                                                            ? <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Correct</span>
                                                                            : <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Incorrect</span>
                                                                    ) : (
                                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'}`}>Skipped</span>
                                                                    )}
                                                                </div>
                                                                <p className={`text-[13px] font-medium ${h1} leading-snug`}>{question.question}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[11px] flex-shrink-0 ${muted}`}>{ans?.timeSpent || 0}s</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
                                                        {question.options.map((option, optIdx) => {
                                                            const isRight = optIdx === question.correctAnswer;
                                                            const isSelected = isAnswered && optIdx === ans.selectedOption;
                                                            return (
                                                                <div key={optIdx} className={`px-3 py-2 rounded-lg border text-[12px] font-medium ${isRight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : isSelected ? 'bg-red-50 border-red-200 text-red-700' : isDark ? 'bg-white/[0.02] border-white/8 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                                    {option}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Results;
