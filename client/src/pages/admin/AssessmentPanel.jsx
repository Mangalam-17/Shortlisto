import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, Edit, Trash2, X, ClipboardList, Mail, BrainCircuit, Loader2 } from 'lucide-react';
import { TableRowSkeleton } from '../../components/Skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usePagination from '../../hooks/usePagination';
import PaginationFooter from '../../components/PaginationFooter';
import { useTheme } from '../../context/ThemeContext';

const AssessmentPanel = () => {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const [showModal, setShowModal] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [formData, setFormData] = useState({ name: '', driveId: '', startTime: '', endTime: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [inviteConfirm, setInviteConfirm] = useState(null);
    const [selectedInviteDriveId, setSelectedInviteDriveId] = useState('');
    const [selectedInviteAssessmentId, setSelectedInviteAssessmentId] = useState('');
    const { page, limit, setPage, setLimit } = usePagination(10);

    const { data, isLoading: assessmentsLoading } = useQuery({
        queryKey: ['assessments-list', page, limit],
        queryFn: async () => { const res = await api.get('/assessments/test/all', { params: { page, limit } }); return res.data; },
        keepPreviousData: true, refetchOnWindowFocus: true, refetchInterval: 5000, refetchIntervalInBackground: true, staleTime: 0
    });
    const assessments = data?.assessments || [];
    const totalCount = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    const { data: drives = [], isLoading: drivesLoading } = useQuery({
        queryKey: ['drives-list'],
        queryFn: async () => { const res = await api.get('/drives'); return Array.isArray(res.data) ? res.data : []; },
        staleTime: 0, refetchOnWindowFocus: false
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.post('/assessments/test/create', data),
        onSuccess: () => { toast.success('Assessment scheduled'); setShowModal(false); setFormData({ name: '', driveId: '', startTime: '', endTime: '' }); queryClient.invalidateQueries({ queryKey: ['assessments-list'] }); queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }); },
        onError: () => toast.error('Creation failed')
    });
    const updateMutation = useMutation({
        mutationFn: (data) => api.put(`/assessments/test/${editingAssessment._id}`, data),
        onSuccess: () => { toast.success('Assessment updated'); setShowModal(false); setEditingAssessment(null); setFormData({ name: '', driveId: '', startTime: '', endTime: '' }); queryClient.invalidateQueries({ queryKey: ['assessments-list'] }); },
        onError: () => toast.error('Update failed')
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/assessments/test/${id}`),
        onSuccess: () => { toast.success('Assessment deleted'); setDeleteConfirm(null); queryClient.invalidateQueries({ queryKey: ['assessments-list'] }); queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }); },
        onError: () => toast.error('Deletion failed')
    });
    const inviteMutation = useMutation({
        mutationFn: (data) => api.post('/candidates/bulk-send-assessment', data),
        onSuccess: () => { toast.success('Invitations sent'); setInviteConfirm(null); },
        onError: (err) => toast.error(err.response?.data?.msg || 'Error sending invitations')
    });

    useEffect(() => {
        const main = document.querySelector('main');
        const open = showModal || deleteConfirm || inviteConfirm;
        document.body.style.overflow = open ? 'hidden' : 'unset';
        if (main) main.style.overflow = open ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; if (main) main.style.overflow = 'unset'; };
    }, [showModal, deleteConfirm, inviteConfirm]);

    const toLocalISOString = (d) => { if (!d) return ''; const date = new Date(d); const off = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - off).toISOString().slice(0, 16); };
    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
    const openCreateModal = () => { setEditingAssessment(null); setFormData({ name: '', driveId: '', startTime: '', endTime: '' }); setShowModal(true); };
    const openEditModal = (a) => { setEditingAssessment(a); setFormData({ name: a.name, driveId: a.drive?._id || a.drive, startTime: toLocalISOString(a.startTime), endTime: toLocalISOString(a.endTime) }); setShowModal(true); };
    const onSubmit = (e) => {
        e.preventDefault();
        const start = new Date(formData.startTime), end = new Date(formData.endTime);
        if (end <= start) return toast.error('End time must be after start time');
        const data = { ...formData, startTime: start.toISOString(), endTime: end.toISOString() };
        editingAssessment ? updateMutation.mutate(data) : createMutation.mutate(data);
    };
    const confirmDelete = () => { if (deleteConfirm) deleteMutation.mutate(deleteConfirm._id); };
    const openInviteModal = (a = null) => {
        if (a) { setSelectedInviteDriveId(a.drive?._id || a.drive); setSelectedInviteAssessmentId(a._id); }
        else { setSelectedInviteDriveId(drives.length > 0 ? drives[0]._id : ''); setSelectedInviteAssessmentId(''); }
        setInviteConfirm(true);
    };
    const confirmInvitations = () => { if (selectedInviteAssessmentId) inviteMutation.mutate({ driveId: selectedInviteDriveId, assessmentTestId: selectedInviteAssessmentId }); };
    const formatDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const getStatus = (s, e) => {
        const now = new Date(), start = new Date(s), end = new Date(e);
        if (now < start) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-600 border-blue-100', dCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' };
        if (now >= start && now <= end) return { label: 'Live', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500 animate-pulse' };
        return { label: 'Closed', cls: 'bg-gray-100 text-gray-500 border-gray-200', dCls: 'bg-white/5 text-white/30 border-white/10', dot: 'bg-gray-400' };
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
    const selectCls = isDark ? 'bg-white/5 border-white/8 text-white focus:border-rose-500/60' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400';
    const modalBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const modalHdr = isDark ? 'border-white/8 bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50';
    const overlay = 'bg-black/50 backdrop-blur-sm';
    const iconBtn = isDark ? 'text-white/30 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50';
    const iconBtnDanger = isDark ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const cancelBtn = isDark ? 'border-white/8 text-white/40 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50';
    const confirmDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const timeBadge = isDark ? 'bg-white/5 border-white/8 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-600';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-5 ${card}`}>
                <div>
                    <h2 className={`text-xl font-bold ${h1}`}>Assessments</h2>
                    <p className={`text-[12px] mt-0.5 ${muted}`}>Schedule and manage assessment tests for your drives</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => openInviteModal()}
                        className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-[12px] font-medium transition-all active:scale-95 ${isDark ? 'border-white/8 text-white/60 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Mail size={14} /><span>Send Invite</span>
                    </button>
                    <button onClick={openCreateModal}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-lg text-[12px] font-semibold hover:bg-rose-600 transition-all active:scale-95 shadow-sm shadow-rose-500/20">
                        <Plus size={14} /><span>Schedule Assessment</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center justify-between ${sectionHdr}`}>
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={13} className="text-rose-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>All Assessments</span>
                        {totalCount > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{totalCount}</span>}
                    </div>
                    {assessmentsLoading && <Loader2 className="animate-spin text-rose-500" size={13} />}
                </div>

                {assessmentsLoading && !data ? (
                    <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className={`h-14 rounded-xl animate-pulse ${skel}`} />)}</div>
                ) : assessments.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><ClipboardList size={20} /></div>
                        <p className={`text-[13px] font-semibold ${h1}`}>No assessments scheduled</p>
                        <p className={`text-[12px] mt-1 ${muted}`}>Schedule an assessment for a recruitment drive</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${tblDivide}`}>
                            <thead>
                                <tr className={tblHdr}>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Assessment</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Linked Drive</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Timing</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${tblDivide}`}>
                                {assessments.map((assessment) => {
                                    const status = getStatus(assessment.startTime, assessment.endTime);
                                    return (
                                        <tr key={assessment._id} className={`transition-all duration-150 group cursor-default ${rowHover}`}>
                                            <td className="px-6 py-4">
                                                <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors`}>{assessment.name}</p>
                                                <p className={`text-[11px] ${muted} mt-0.5`}>ID: {assessment._id.substring(0, 8)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`text-[13px] font-medium ${h1}`}>{assessment.drive?.name || 'N/A'}</p>
                                                <p className={`text-[11px] ${muted} mt-0.5`}>{assessment.drive?.university || 'Global'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] w-fit ${timeBadge}`}>
                                                        <Clock size={11} className="text-rose-500" />{formatDateTime(assessment.startTime)}
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 text-[11px] ${muted} pl-1`}>
                                                        <Calendar size={11} />{formatDateTime(assessment.endTime)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wide ${isDark ? status.dCls : status.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEditModal(assessment)} className={`p-2 rounded-lg transition-all ${iconBtn}`} title="Edit"><Edit size={15} /></button>
                                                    <button onClick={() => setDeleteConfirm(assessment)} className={`p-2 rounded-lg transition-all ${iconBtnDanger}`} title="Delete"><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <PaginationFooter pagination={{ page, limit, total: totalCount, totalPages }} onPageChange={setPage} onLimitChange={setLimit} />
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={() => setShowModal(false)} />
                    <div className={`relative z-10 w-full max-w-lg rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between ${modalHdr}`}>
                            <div>
                                <h3 className={`text-[16px] font-bold ${h1}`}>{editingAssessment ? 'Edit Assessment' : 'Schedule Assessment'}</h3>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>Fill in the details below</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg transition-all ${iconBtn}`}><X size={16} /></button>
                        </div>
                        <form onSubmit={onSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Assessment Name</label>
                                <input type="text" name="name" value={formData.name} onChange={onChange} required placeholder="e.g. Tech Assessment Phase 1"
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Linked Drive</label>
                                <select name="driveId" value={formData.driveId} onChange={onChange} required disabled={drivesLoading && drives.length === 0}
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50 ${selectCls}`}>
                                    <option value="">{drivesLoading ? 'Loading...' : 'Select Drive'}</option>
                                    {drives.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[{ label: 'Start Time', name: 'startTime' }, { label: 'End Time', name: 'endTime' }].map(f => (
                                    <div key={f.name}>
                                        <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>{f.label}</label>
                                        <input type="datetime-local" name={f.name} value={formData[f.name]} onChange={onChange} required
                                            className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                                    </div>
                                ))}
                            </div>
                            <div className={`pt-4 border-t flex justify-end gap-3 ${confirmDivider}`}>
                                <button type="button" onClick={() => setShowModal(false)} className={`px-5 py-2.5 border rounded-xl text-[13px] font-medium transition-all ${cancelBtn}`}>Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-rose-500/20">
                                    {(createMutation.isPending || updateMutation.isPending) ? <><Loader2 className="animate-spin" size={14} /><span>Saving...</span></> : <span>{editingAssessment ? 'Update' : 'Schedule'}</span>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={() => setDeleteConfirm(null)} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100"><Trash2 className="text-red-500" size={22} /></div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>Delete Assessment?</h3>
                            <p className={`text-[13px] ${muted}`}>This will permanently delete <strong className={h1}>{deleteConfirm.name}</strong>.</p>
                        </div>
                        <div className={`flex border-t ${confirmDivider}`}>
                            <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-3.5 text-[12px] font-medium border-r transition-all ${confirmDivider} ${isDark ? 'text-white/40 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50'}`}>Cancel</button>
                            <button onClick={confirmDelete} disabled={deleteMutation.isPending}
                                className="flex-1 py-3.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {deleteMutation.isPending ? <><Loader2 className="animate-spin" size={13} /><span>Deleting...</span></> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {inviteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={() => !inviteMutation.isPending && setInviteConfirm(null)} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between ${modalHdr}`}>
                            <div>
                                <h3 className={`text-[16px] font-bold ${h1}`}>Send Invitations</h3>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>Select drive and assessment</p>
                            </div>
                            <button onClick={() => setInviteConfirm(null)} className={`p-2 rounded-lg transition-all ${iconBtn}`}><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Target Drive</label>
                                <select value={selectedInviteDriveId} disabled={inviteMutation.isPending}
                                    onChange={(e) => { setSelectedInviteDriveId(e.target.value); setSelectedInviteAssessmentId(''); }}
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50 ${selectCls}`}>
                                    <option value="">Select Drive</option>
                                    {drives.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Target Assessment</label>
                                {assessments.filter(a => (a.drive?._id || a.drive) === selectedInviteDriveId).length > 0 ? (
                                    <select value={selectedInviteAssessmentId} disabled={inviteMutation.isPending}
                                        onChange={(e) => setSelectedInviteAssessmentId(e.target.value)}
                                        className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50 ${selectCls}`}>
                                        <option value="">Select Assessment</option>
                                        {assessments.filter(a => (a.drive?._id || a.drive) === selectedInviteDriveId).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                        <p className="text-[12px] text-amber-600">{selectedInviteDriveId ? 'No assessments found for this drive.' : 'Select a drive first.'}</p>
                                    </div>
                                )}
                            </div>
                            <div className={`pt-4 border-t flex justify-end gap-3 ${confirmDivider}`}>
                                <button onClick={() => setInviteConfirm(null)} disabled={inviteMutation.isPending} className={`px-5 py-2.5 border rounded-xl text-[13px] font-medium transition-all ${cancelBtn}`}>Cancel</button>
                                <button onClick={confirmInvitations} disabled={!selectedInviteAssessmentId || inviteMutation.isPending}
                                    className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-rose-500/20">
                                    {inviteMutation.isPending ? <><Loader2 className="animate-spin" size={14} /><span>Sending...</span></> : <><Mail size={14} /><span>Send Invites</span></>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentPanel;
