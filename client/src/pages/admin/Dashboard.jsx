import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { LayoutDashboard, Users, CheckCircle, BrainCircuit, TrendingUp, Plus, FileText, Calendar, ArrowUpRight, ArrowRight, Zap, Clock, Activity, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';

const getDriveStatus = (s, e) => {
    const now = new Date(), start = new Date(s), end = new Date(e);
    if (now < start) return { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600 border-blue-100', dCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' };
    if (now >= start && now <= end) return { label: 'Live', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500 animate-pulse' };
    return { label: 'Ended', cls: 'bg-gray-100 text-gray-500 border-gray-200', dCls: 'bg-white/5 text-white/30 border-white/10', dot: 'bg-gray-400' };
};
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const now = new Date();
const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function Dashboard() {
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const { data: stats, isLoading: loading } = useQuery({
        queryKey: ['dashboard_stats'],
        queryFn: async () => { const r = await api.get('/dashboard/stats'); return r.data; },
        staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 5000
    });
    const { data: rdd, isLoading: drivesLoading } = useQuery({
        queryKey: ['drives-recent'],
        queryFn: async () => { const r = await api.get('/drives', { params: { page: 1, limit: 5 } }); return r.data; },
        staleTime: 30000
    });
    const recentDrives = rdd?.drives || [];

    const [ds, setDs] = useState({ totalDrives: 0, totalCandidates: 0, shortlistedCandidates: 0, completedAssessments: 0 });
    useEffect(() => {
        if (!loading && stats) {
            let step = 0;
            const t = setInterval(() => {
                step++; const p = step / 20;
                setDs({ totalDrives: Math.floor(stats.totalDrives * p), totalCandidates: Math.floor(stats.totalCandidates * p), shortlistedCandidates: Math.floor(stats.shortlistedCandidates * p), completedAssessments: Math.floor(stats.completedAssessments * p) });
                if (step >= 20) { setDs(stats); clearInterval(t); }
            }, 10);
            return () => clearInterval(t);
        }
    }, [stats, loading]);

    // theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8 hover:border-white/15' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const divider = isDark ? 'divide-white/5' : 'divide-gray-100';
    const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50';
    const skel = isDark ? 'bg-white/5' : 'bg-gray-100';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const barTrack = isDark ? 'bg-white/8' : 'bg-gray-100';
    const badgeN = isDark ? 'bg-white/5 border-white/8 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500';

    const statCards = [
        { title: 'Recruitment Drives', key: 'totalDrives', icon: <LayoutDashboard size={17} />, path: '/admin/create-drive', color: '#E11D48', iconCls: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500', bar: stats ? Math.min((stats.totalDrives / Math.max(stats.totalDrives, 10)) * 100, 100) : 0, barColor: 'bg-rose-500', note: 'Total drives created' },
        { title: 'Active Candidates', key: 'totalCandidates', icon: <Users size={17} />, path: '/admin/candidates', color: '#2563EB', iconCls: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-500', bar: stats ? Math.min((stats.totalCandidates / Math.max(stats.totalCandidates, 100)) * 100, 100) : 0, barColor: 'bg-blue-500', note: 'Across all drives' },
        { title: 'Shortlisted', key: 'shortlistedCandidates', icon: <CheckCircle size={17} />, path: '/admin/candidates', color: '#059669', iconCls: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-500', bar: stats && stats.totalCandidates > 0 ? (stats.shortlistedCandidates / stats.totalCandidates) * 100 : 0, barColor: 'bg-emerald-500', note: stats && stats.totalCandidates > 0 ? `${((stats.shortlistedCandidates / stats.totalCandidates) * 100).toFixed(0)}% conversion` : '0% conversion' },
        { title: 'Assessments', key: 'completedAssessments', icon: <BrainCircuit size={17} />, path: '/admin/schedule-assessment', color: '#D97706', iconCls: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-500', bar: stats ? Math.min((stats.completedAssessments / Math.max(stats.completedAssessments, 10)) * 100, 100) : 0, barColor: 'bg-amber-500', note: 'Scheduled tests' },
    ];

    const quickActions = [
        { label: 'New Drive', desc: 'Launch a recruitment campaign', icon: Plus, path: '/admin/create-drive', cls: isDark ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/40' : 'bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200', iconCls: isDark ? 'text-rose-400' : 'text-rose-500' },
        { label: 'Schedule Assessment', desc: 'Set up a timed test', icon: Calendar, path: '/admin/schedule-assessment', cls: isDark ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/40' : 'bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-200', iconCls: isDark ? 'text-blue-400' : 'text-blue-500' },
        { label: 'Upload Questions', desc: 'Build your question bank', icon: FileText, path: '/admin/questions', cls: isDark ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/40' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200', iconCls: isDark ? 'text-emerald-400' : 'text-emerald-500' },
        { label: 'View Analytics', desc: 'Deep performance insights', icon: TrendingUp, path: '/admin/analytics', cls: isDark ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/40' : 'bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-200', iconCls: isDark ? 'text-amber-400' : 'text-amber-500' },
    ];

    const pipelineStages = [
        { label: 'Registered', value: stats?.totalCandidates || 0, color: 'bg-rose-500', pct: 100 },
        { label: 'Assessed', value: stats?.completedAssessments || 0, color: 'bg-blue-500', pct: stats?.totalCandidates > 0 ? (stats.completedAssessments / Math.max(stats.totalCandidates, 1)) * 100 : 0 },
        { label: 'Shortlisted', value: stats?.shortlistedCandidates || 0, color: 'bg-emerald-500', pct: stats?.totalCandidates > 0 ? (stats.shortlistedCandidates / Math.max(stats.totalCandidates, 1)) * 100 : 0 },
    ];

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-400">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className={`text-xl font-bold ${h1}`}>{greeting} 👋</h1>
                    <p className={`text-[13px] mt-0.5 ${muted}`}>{dateStr}</p>
                </div>
                {!loading && stats && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium ${badgeN}`}><Activity size={11} /> {stats.totalDrives} drives</span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium ${badgeN}`}><Users size={11} /> {stats.totalCandidates} candidates</span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium bg-emerald-50 border-emerald-100 text-emerald-600">
                            <CheckCircle size={11} /> {stats.shortlistedCandidates} shortlisted
                        </span>
                    </div>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? [...Array(4)].map((_, i) => <div key={i} className={`rounded-2xl h-36 animate-pulse ${skel}`} />) : (
                    statCards.map((c, i) => (
                        <button key={i} onClick={() => navigate(c.path)}
                            className={`rounded-2xl p-5 text-left border transition-all duration-200 group ${card}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-xl ${c.iconCls} transition-transform duration-200 group-hover:scale-110`}>{c.icon}</div>
                                <ArrowUpRight size={13} className={`${muted} group-hover:text-rose-500 transition-colors`} />
                            </div>
                            <p className={`text-[11px] font-medium ${muted} mb-0.5`}>{c.title}</p>
                            <h3 className={`text-3xl font-bold ${h1} tracking-tight mb-3`}>{ds[c.key]}</h3>
                            <div className={`w-full h-1 ${barTrack} rounded-full overflow-hidden mb-2`}>
                                <div className={`h-full rounded-full transition-all duration-1000 ${c.barColor}`} style={{ width: `${Math.max(c.bar, c.bar > 0 ? 4 : 0)}%` }} />
                            </div>
                            <p className={`text-[11px] ${muted}`}>{c.note}</p>
                        </button>
                    ))
                )}
            </div>

            {/* Pipeline + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pipeline */}
                <div className={`rounded-2xl border ${card} overflow-hidden`}>
                    <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                        <Zap size={13} className="text-amber-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Pipeline Overview</span>
                    </div>
                    <div className="p-5 space-y-4">
                        {pipelineStages.map((stage, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                        <span className={`text-[12px] font-medium ${muted}`}>{stage.label}</span>
                                    </div>
                                    <span className={`text-[13px] font-bold ${h1}`}>{loading ? '—' : stage.value}</span>
                                </div>
                                <div className={`w-full h-1.5 ${barTrack} rounded-full overflow-hidden`}>
                                    <div className={`h-full rounded-full transition-all duration-1000 ${stage.color}`} style={{ width: loading ? '0%' : `${Math.max(stage.pct, stage.value > 0 ? 3 : 0)}%` }} />
                                </div>
                            </div>
                        ))}
                        {!loading && stats?.totalCandidates > 0 && (
                            <div className={`pt-3 border-t ${isDark ? 'border-white/8' : 'border-gray-100'} flex items-center justify-between`}>
                                <span className={`text-[11px] ${muted}`}>Overall conversion</span>
                                <span className="text-[13px] font-bold text-emerald-500">{((shortlisted / Math.max(stats.totalCandidates, 1)) * 100).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={`lg:col-span-2 rounded-2xl border ${card} overflow-hidden`}>
                    <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                        <Zap size={13} className="text-rose-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Quick Actions</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {quickActions.map((a, i) => (
                            <button key={i} onClick={() => navigate(a.path)}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 group text-left ${a.cls}`}>
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                    <a.icon size={16} className={a.iconCls} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-semibold text-[12px] ${h1} group-hover:text-rose-500 transition-colors`}>{a.label}</h4>
                                    <p className={`text-[11px] ${muted} mt-0.5 truncate`}>{a.desc}</p>
                                </div>
                                <ArrowRight size={13} className={`${muted} group-hover:translate-x-1 transition-all flex-shrink-0`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Drives */}
            <div className={`rounded-2xl border ${card} overflow-hidden`}>
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${sectionHdr}`}>
                    <div className="flex items-center gap-2">
                        <Clock size={13} className="text-blue-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Recent Drives</span>
                    </div>
                    <button onClick={() => navigate('/admin/create-drive')} className={`flex items-center gap-1 text-[12px] font-medium text-rose-500 hover:text-rose-600 transition-colors`}>
                        View all <ChevronRight size={13} />
                    </button>
                </div>
                {drivesLoading ? (
                    <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className={`h-12 rounded-xl animate-pulse ${skel}`} />)}</div>
                ) : recentDrives.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
                            <FileText size={18} className={muted} />
                        </div>
                        <p className={`text-[13px] font-medium ${muted}`}>No drives yet</p>
                        <button onClick={() => navigate('/admin/create-drive')} className="mt-2 text-[12px] text-rose-500 hover:text-rose-600 font-medium transition-colors">Create your first drive →</button>
                    </div>
                ) : (
                    <div className={`divide-y ${divider}`}>
                        {recentDrives.map((drive) => {
                            const status = getDriveStatus(drive.startTime, drive.endTime);
                            const yieldPct = drive.candidateCount > 0 ? ((drive.shortlistedCount / drive.candidateCount) * 100).toFixed(0) : 0;
                            return (
                                <div key={drive._id} onClick={() => navigate('/admin/create-drive')}
                                    className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all group ${rowHover}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px] flex-shrink-0 transition-transform group-hover:scale-105 ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
                                        {drive.university?.charAt(0)?.toUpperCase() || 'D'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors truncate`}>{drive.name}</p>
                                        <p className={`text-[11px] ${muted} truncate`}>{drive.university}</p>
                                    </div>
                                    <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wide ${isDark ? status.dCls : status.cls}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                                    </span>
                                    <div className="hidden md:flex flex-col items-end">
                                        <span className={`text-[13px] font-bold ${h1}`}>{drive.candidateCount}</span>
                                        <span className={`text-[10px] ${muted}`}>candidates</span>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-end">
                                        <span className="text-[13px] font-bold text-emerald-500">{yieldPct}%</span>
                                        <span className={`text-[10px] ${muted}`}>yield</span>
                                    </div>
                                    <span className={`hidden md:block text-[11px] ${muted}`}>{fmtDate(drive.startTime)}</span>
                                    <ChevronRight size={13} className={`${muted} group-hover:translate-x-0.5 transition-all flex-shrink-0`} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
