import React, { useState, useMemo } from 'react';
import api from '../../utils/api';
import { Download, TrendingUp, Users, Award, Target, BarChart3, Loader2, ChevronRight, Search, ListChecks, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { CardSkeleton, TableRowSkeleton } from '../../components/Skeleton';
import useFilters from '../../hooks/useFilters';
import usePagination from '../../hooks/usePagination';
import PaginationFooter from '../../components/PaginationFooter';
import * as XLSX from 'xlsx';
import { useTheme } from '../../context/ThemeContext';

const Analytics = () => {
    const { isDark } = useTheme();
    const [selectedDrive, setSelectedDrive] = useState('');
    const [exporting, setExporting] = useState(false);

    // Global Overview Hooks
    const { page, limit, setPage, setLimit } = usePagination(10);
    const { filters, setFilter, clearFilters, debouncedSearch } = useFilters({
        search: ''
    });

    const { data: drives = [] } = useQuery({
        queryKey: ['drives-list'],
        queryFn: async () => {
            const res = await api.get('/drives');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: false
    });

    // Global Drives Analytics
    const {
        data: globalData,
        isLoading: loadingGlobal,
        isFetching: fetchingGlobal
    } = useQuery({
        queryKey: ['analytics-overview', debouncedSearch, page, limit],
        queryFn: async () => {
            const res = await api.get('/analytics/overview', {
                params: {
                    page,
                    limit,
                    search: debouncedSearch
                }
            });
            return res.data;
        },
        enabled: !selectedDrive
    });

    // Specific Drive Analytics
    const {
        data: analytics,
        isLoading: loading,
        isFetching: refetching
    } = useQuery({
        queryKey: ['analytics', selectedDrive],
        queryFn: async () => {
            const res = await api.get(`/analytics/drive/${selectedDrive}`);
            return res.data;
        },
        enabled: !!selectedDrive,
        staleTime: 5 * 60 * 1000
    });

    const exportToExcel = async () => {
        try {
            if (!analytics || !analytics.questionAnalysis) {
                return toast.error('No analytics data available to export');
            }

            setExporting(true);
            const drive = drives.find(d => d._id === selectedDrive);
            const driveName = drive?.name || 'Assessment';

            // Fetch candidate results for this drive
            let candidateResults = [];
            try {
                const res = await api.get('/results', { params: { driveId: selectedDrive, limit: 1000 } });
                candidateResults = res.data?.results || [];
            } catch (e) {
                console.error('Failed to fetch candidate results for export:', e);
            }

            const wb = XLSX.utils.book_new();

            // ─── Sheet 1: Drive Overview ───
            const overviewData = [
                ['DRIVE ANALYTICS REPORT'],
                ['Generated', new Date().toLocaleString('en-IN')],
                [''],
                ['Drive Information'],
                ['Drive Name', driveName],
                ['University', drive?.university || 'N/A'],
                ['Start Time', drive?.startTime ? new Date(drive.startTime).toLocaleString('en-IN') : 'N/A'],
                ['End Time', drive?.endTime ? new Date(drive.endTime).toLocaleString('en-IN') : 'N/A'],
                [''],
                ['Performance Metrics'],
                ['Total Candidates', analytics.totalCandidates],
                ['Average Score', analytics.averageScore],
                ['Median Score', analytics.medianScore],
                ['Highest Score', analytics.maxScore || 'N/A'],
                ['Lowest Score', analytics.minScore ?? 'N/A'],
                ['Pass Rate', `${analytics.passRate}%`],
                ['Passing Threshold', analytics.passingScore ?? 'N/A'],
                ['Total Questions', analytics.questionAnalysis.length],
            ];
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            wsOverview['!cols'] = [{ wch: 22 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, wsOverview, 'Drive Overview');

            // ─── Sheet 2: Question Analysis ───
            const questionHeaders = ['S.No', 'Question', 'Correct Answers', 'Total Attempts', 'Success Rate (%)', 'Difficulty'];
            const questionRows = analytics.questionAnalysis.map((q, i) => [
                i + 1,
                (q.question || 'N/A').replace(/\.\.\.$/, ''),
                q.correctCount || 0,
                q.totalAttempts || 0,
                `${q.successRate || 0}%`,
                q.difficulty || 'N/A'
            ]);
            const wsQuestions = XLSX.utils.aoa_to_sheet([questionHeaders, ...questionRows]);
            wsQuestions['!cols'] = [{ wch: 6 }, { wch: 60 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsQuestions, 'Question Analysis');

            // ─── Sheet 3: Candidate Results ───
            if (candidateResults.length > 0) {
                const candidateHeaders = ['S.No', 'Name', 'Email', 'Score', 'Max Score', 'Percentage (%)', 'Proctoring Flags', 'Submitted At'];
                const candidateRows = candidateResults.map((r, i) => {
                    const score = r.totalScore || 0;
                    const maxScore = r.maxScore || analytics.questionAnalysis.length || 1;
                    const pct = ((score / maxScore) * 100).toFixed(1);
                    return [
                        i + 1,
                        r.candidate?.name || 'N/A',
                        r.candidate?.email || 'N/A',
                        score,
                        maxScore,
                        `${pct}%`,
                        r.proctoringLogs?.length || 0,
                        r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN') : 'N/A'
                    ];
                });
                const wsCandidates = XLSX.utils.aoa_to_sheet([candidateHeaders, ...candidateRows]);
                wsCandidates['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 22 }];
                XLSX.utils.book_append_sheet(wb, wsCandidates, 'Candidate Results');
            }

            // ─── Sheet 4: Score Distribution ───
            if (analytics.scoreDistribution?.length > 0) {
                const distHeaders = ['Score Range', 'Number of Candidates'];
                const distRows = analytics.scoreDistribution.map(d => [
                    d.range,
                    d.count
                ]);
                const wsDist = XLSX.utils.aoa_to_sheet([distHeaders, ...distRows]);
                wsDist['!cols'] = [{ wch: 18 }, { wch: 22 }];
                XLSX.utils.book_append_sheet(wb, wsDist, 'Score Distribution');
            }

            XLSX.writeFile(wb, `${driveName.replace(/[^a-zA-Z0-9]/g, '_')}_Analytics.xlsx`);
            toast.success('Analytics exported successfully');
        } catch (err) {
            console.error('Export Error:', err);
            toast.error('Export failed: ' + (err.message || 'Unknown error'));
        } finally {
            setExporting(false);
        }
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
    const barTrack = isDark ? 'bg-white/8' : 'bg-gray-100';
    const backBtn = isDark ? 'border-white/8 text-white/40 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900';

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-5 ${card}`}>
                <div className="flex items-center gap-3">
                    {selectedDrive && (
                        <button onClick={() => setSelectedDrive('')}
                            className={`p-2 border rounded-lg transition-all ${backBtn}`}>
                            <ArrowLeft size={15} />
                        </button>
                    )}
                    <div>
                        <h2 className={`text-xl font-bold ${h1}`}>{selectedDrive ? 'Drive Analytics' : 'Analytics'}</h2>
                        <p className={`text-[12px] mt-0.5 ${muted}`}>{selectedDrive ? 'Detailed performance metrics for this drive' : 'System-wide recruitment performance'}</p>
                    </div>
                </div>
                {selectedDrive ? (
                    <button onClick={exportToExcel} disabled={!analytics || exporting}
                        className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-[12px] font-medium transition-all active:scale-95 disabled:opacity-30 ${isDark ? 'border-white/8 text-white/60 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        <span>{exporting ? 'Exporting...' : 'Export Report'}</span>
                    </button>
                ) : (
                    <div className="relative w-full sm:w-64">
                        <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                        <input type="text" placeholder="Search drives..."
                            className={`w-full pl-9 pr-4 py-2 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 transition-all ${inputCls}`}
                            value={filters.search} onChange={e => setFilter('search', e.target.value)} />
                    </div>
                )}
            </div>

            {/* Global Overview */}
            {!selectedDrive && (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                        <TrendingUp size={13} className="text-amber-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>All Drives Performance</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${tblDivide}`}>
                            <thead>
                                <tr className={tblHdr}>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Drive</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Institution</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Submissions</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Avg Score</th>
                                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${tblDivide}`}>
                                {loadingGlobal ? (
                                    [...Array(4)].map((_, i) => <TableRowSkeleton key={i} columns={5} />)
                                ) : globalData?.analytics?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><BarChart3 size={20} /></div>
                                            <p className={`text-[13px] font-semibold ${h1}`}>No analytics yet</p>
                                            <p className={`text-[12px] mt-1 ${muted}`}>Complete some assessments to see data here</p>
                                        </td>
                                    </tr>
                                ) : (
                                    globalData?.analytics?.map((drive) => (
                                        <tr key={drive.driveId} className={`transition-all duration-150 group cursor-default ${rowHover}`}>
                                            <td className="px-6 py-4">
                                                <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors`}>{drive.driveName}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`text-[12px] ${muted}`}>{drive.university}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users size={13} className={muted} />
                                                    <span className={`text-[13px] font-medium ${h1}`}>{drive.totalSubmissions}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[18px] font-bold ${drive.averageScore >= 70 ? 'text-emerald-500' : drive.averageScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    {drive.averageScore}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setSelectedDrive(drive.driveId)}
                                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg text-[12px] font-medium transition-all ${isDark ? 'border-white/8 text-white/50 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                    View <ChevronRight size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationFooter pagination={{ page: globalData?.currentPage || 1, limit: globalData?.limit || 10, total: globalData?.total || 0, totalPages: globalData?.totalPages || 0 }} onPageChange={setPage} onLimitChange={setLimit} />
                </div>
            )}

            {/* Drive Detail Analytics */}
            {selectedDrive && (
                <div className="space-y-5">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <div key={i} className={`h-28 rounded-2xl animate-pulse ${skel}`} />)}
                        </div>
                    ) : analytics?.totalCandidates > 0 ? (
                        <>
                            {/* Stat cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Candidates', val: analytics.totalCandidates, icon: Users, color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
                                    { label: 'Average Score', val: analytics.averageScore, icon: TrendingUp, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
                                    { label: 'Median Score', val: analytics.medianScore, icon: Target, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
                                    { label: 'Pass Rate', val: `${analytics.passRate}%`, icon: Award, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
                                ].map((s, i) => (
                                    <div key={i} className={`border rounded-2xl p-5 ${card}`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                                            <s.icon size={17} className={s.color} />
                                        </div>
                                        <p className={`text-[11px] font-medium ${muted} mb-0.5`}>{s.label}</p>
                                        <h3 className={`text-2xl font-bold ${h1}`}>{s.val}</h3>
                                    </div>
                                ))}
                            </div>

                            {/* Question performance table */}
                            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                                <div className={`px-6 py-3.5 border-b flex items-center justify-between ${sectionHdr}`}>
                                    <div className="flex items-center gap-2">
                                        <ListChecks size={13} className="text-rose-500" />
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Question Performance</span>
                                    </div>
                                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${isDark ? 'bg-white/5 border-white/8 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                        {analytics.questionAnalysis.length} questions
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className={`min-w-full divide-y ${tblDivide}`}>
                                        <thead>
                                            <tr className={tblHdr}>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Question</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Correct</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Attempts</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Success Rate</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Difficulty</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${tblDivide}`}>
                                            {analytics.questionAnalysis.map((q, idx) => (
                                                <tr key={idx} className={`transition-all duration-150 group ${rowHover}`}>
                                                    <td className="px-6 py-4 max-w-xs">
                                                        <p className={`text-[13px] font-medium ${h1} line-clamp-2`}>{q.question}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[18px] font-bold ${h1}`}>{q.correctCount}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[13px] ${muted}`}>{q.totalAttempts}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-20 h-1.5 ${barTrack} rounded-full overflow-hidden`}>
                                                                <div className={`h-full rounded-full transition-all duration-700 ${q.successRate >= 70 ? 'bg-emerald-500' : q.successRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${q.successRate}%` }} />
                                                            </div>
                                                            <span className={`text-[12px] font-semibold ${h1}`}>{q.successRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wide ${
                                                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-red-50 text-red-600 border-red-100'
                                                        }`}>{q.difficulty}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`border rounded-2xl py-20 text-center ${card}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><Users size={20} /></div>
                            <p className={`text-[13px] font-semibold ${h1}`}>No data yet</p>
                            <p className={`text-[12px] mt-1 ${muted}`}>Candidates need to complete assessments first</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Analytics;
