import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Search, CheckCircle, XCircle, Mail, AlertTriangle, Users, Clock, X, Loader2, AlertCircle, Download, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { TableRowSkeleton } from '../../components/Skeleton';
import useFilters from '../../hooks/useFilters';
import usePagination from '../../hooks/usePagination';
import FilterPanel from '../../components/FilterPanel';
import FilterChips from '../../components/FilterChips';
import PaginationFooter from '../../components/PaginationFooter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useTheme } from '../../context/ThemeContext';

const CandidateList = () => {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();

    // Discrete Pagination & Filtering Hooks
    const { page, limit, setPage, setLimit } = usePagination(20);
    const { filters, setFilter, setFilters, clearFilters, debouncedSearch } = useFilters({
        driveId: '',
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [candidateToShortlist, setCandidateToShortlist] = useState(null);
    const [candidateToRevert, setCandidateToRevert] = useState(null);
    const [showRevertModal, setShowRevertModal] = useState(false);

    const { data: drives = [] } = useQuery({
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
        isLoading,
        isFetching,
        status
    } = useQuery({
        queryKey: ['candidates', debouncedSearch, page, limit, filters],
        queryFn: async () => {
            const res = await api.get('/candidates', {
                params: {
                    page,
                    limit,
                    search: debouncedSearch,
                    ...filters
                }
            });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: 5000
    });

    const candidates = data?.candidates || [];
    const totalCount = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    const activeDrive = useMemo(() => drives.find(d => d._id === filters.driveId), [drives, filters.driveId]);
    const [driveSchema, setDriveSchema] = useState(null);

    // Fetch full drive schema when a drive is selected (list API no longer includes formSchema)
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!filters.driveId) {
                setDriveSchema(null);
                return;
            }
            try {
                const res = await api.get(`/drives/${filters.driveId}`);
                if (!cancelled) setDriveSchema(res.data || null);
            } catch (e) {
                if (!cancelled) setDriveSchema(null);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [filters.driveId]);

    const formFields = driveSchema?.formSchema || [];
 
    // Derive table columns based on active dynamic filters
    const tableColumns = useMemo(() => {
        if (!formFields || formFields.length === 0) return [];

        return formFields
            .filter(field => {
                if (!field || field.type === 'file') return false;
                
                // Core info is already in the first two columns
                if (['name', 'fullName', 'email', 'personalEmail', 'contact', 'phone', 'university'].includes(field.fieldId)) return false;

                // Check if this field is currently being filtered
                const isFiltered = !!filters[field.fieldId];
                
                // Hide columns that are currently being filtered to avoid redundancy
                if (isFiltered) return false;
                
                // Check if it's a range filter (min/max)
                const pascalId = field.fieldId.charAt(0).toUpperCase() + field.fieldId.slice(1);
                const isRangeFiltered = !!filters[`min${pascalId}`] || !!filters[`max${pascalId}`];

                return isRangeFiltered;
            })
            .map(field => ({
                key: field.fieldId,
                label: field.label,
                type: field.type
            }));
    }, [formFields, filters]);

    const renderCellContent = (candidate, column) => {
        const value = candidate[column.key] || candidate.responses?.[column.key];
        if (value === undefined || value === null || value === '') return '-';

        if (column.key === 'technicalSkills' || Array.isArray(value)) {
            const skills = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim());
            return (
                <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 2).map((skill, index) => (
                        <span key={index} className="px-2 py-0.5 bg-[#E11D48]/10 text-[#E11D48] rounded-full text-[7px] font-medium uppercase">
                            {skill}
                        </span>
                    ))}
                    {skills.length > 2 && (
                        <span className="px-2 py-0.5 bg-white/8 text-white/40 rounded-full text-[7px] font-medium">
                            +{skills.length - 2}
                        </span>
                    )}
                </div>
            );
        }

        if (column.key === 'backlogs') {
            return value === 'yes' ? (
                <div className="flex items-center text-[10px] text-red-600">
                    <AlertCircle className="w-3 h-3 mr-1.5" />
                    <span>Has Backlogs</span>
                </div>
            ) : (
                <div className="flex items-center text-[10px] text-emerald-600">
                    <CheckCircle className="w-3 h-3 mr-1.5" />
                    <span>No Backlogs</span>
                </div>
            );
        }

        return <span className="text-[10px] text-white/50 truncate max-w-[150px]">{String(value)}</span>;
    };

    const shortlistMutation = useMutation({
        mutationFn: async (id) => {
            if (id === 'ALL') {
                return api.post('/candidates/bulk-shortlist', {
                    search: debouncedSearch,
                    ...filters
                });
            }
            return api.post(`/candidates/shortlist/${id}`);
        },
        onMutate: async (id) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['candidates'] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(['candidates', debouncedSearch, page, limit, filters]);

            // Optimistically update to the new value
            if (id !== 'ALL') {
                queryClient.setQueryData(['candidates', debouncedSearch, page, limit, filters], old => {
                    if (!old || !old.candidates) return old;
                    return {
                        ...old,
                        candidates: old.candidates.map(c => 
                            c._id === id ? { ...c, isShortlisted: true } : c
                        )
                    };
                });
            }

            return { previousData };
        },
        onSuccess: (data, id) => {
            toast.success(id === 'ALL' ? 'Batch operation complete' : 'Candidate shortlisted');
        },
        onError: (err, id, context) => {
            // Roll back to the previous value if mutation fails
            if (context?.previousData) {
                queryClient.setQueryData(['candidates', debouncedSearch, page, limit, filters], context.previousData);
            }
            toast.error(err.response?.data?.msg || 'Shortlist failed');
        },
        onSettled: () => {
            // Always refetch after error or success to sync with server
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
        }
    });

    const revertMutation = useMutation({
        mutationFn: async (id) => {
            return api.post(`/candidates/revert/${id}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['candidates'] });
            const previousData = queryClient.getQueryData(['candidates', debouncedSearch, page, limit, filters]);

            queryClient.setQueryData(['candidates', debouncedSearch, page, limit, filters], old => {
                if (!old || !old.candidates) return old;
                return {
                    ...old,
                    candidates: old.candidates.map(c => 
                        c._id === id ? { ...c, isShortlisted: false } : c
                    )
                };
            });

            return { previousData };
        },
        onSuccess: () => {
            toast.success('Candidate status reverted to pending');
        },
        onError: (err, id, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['candidates', debouncedSearch, page, limit, filters], context.previousData);
            }
            toast.error(err.response?.data?.msg || 'Revert failed');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
        }
    });

    const initiateShortlist = (id) => {
        setCandidateToShortlist(id);
        setShowConfirmModal(true);
    };

    const initiateShortlistAll = () => {
        setCandidateToShortlist('ALL');
        setShowConfirmModal(true);
    };

    const initiateRevert = (id) => {
        setCandidateToRevert(id);
        setShowRevertModal(true);
    };

    const cancelRevert = () => {
        setShowRevertModal(false);
        setCandidateToRevert(null);
    };

    const confirmShortlist = async () => {
        const id = candidateToShortlist;
        setShowConfirmModal(false);
        shortlistMutation.mutate(id);
    };

    const confirmRevert = async () => {
        const id = candidateToRevert;
        setShowRevertModal(false);
        revertMutation.mutate(id);
    };

    const cancelShortlist = () => {
        setShowConfirmModal(false);
        setCandidateToShortlist(null);
    };

    // Export logic
    const exportToExcel = () => {
        if (!filters.driveId) return toast.error('Select a drive to export');
        if (candidates.length === 0) return toast.error('No candidates to export');

        const driveName = activeDrive?.name || 'candidates';
        const exportData = candidates.map((c, idx) => ({
            'S.No': idx + 1,
            'Name': c.name || '',
            'Email': c.personalEmail || c.email || '',
            'University': c.university || '',
            'CGPA': c.cgpa || c.academicPerformance || '',
            'Shortlisted': c.isShortlisted ? 'Yes' : 'No'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
        XLSX.writeFile(wb, `${driveName.replace(/\s+/g, '_')}_Candidates.xlsx`);
    };

    // Dynamic Filter Configurations derived from Drive Form Schema
    const filterConfigs = useMemo(() => {
        const configs = [
            {
                id: 'driveId',
                label: 'Drive',
                type: 'select',
                options: drives.map(d => ({ value: d._id, label: `${d.name} (${d.university})` }))
            }
        ];

        // Add dynamic filters if a drive is selected
        if (formFields && formFields.length > 0) {
            formFields.forEach(field => {
                // Skip file uploads and basic info already in search/table
                if (field.type === 'file' || ['name', 'email', 'contact', 'university'].includes(field.fieldId)) return;

                const config = {
                    id: field.fieldId,
                    label: field.label,
                };

                if (['select', 'radio'].includes(field.type) && field.options) {
                    config.type = 'select';
                    config.options = field.options.map(opt => ({ 
                        value: typeof opt === 'string' ? opt : opt.value, 
                        label: typeof opt === 'string' ? opt : opt.label 
                    }));
                } else if (['number', 'cgpa'].includes(field.type)) {
                    config.type = 'range';
                } else {
                    config.type = 'text';
                }

                configs.push(config);
            });
        }

        // Add standard filters at the end
        configs.push({
            id: 'isShortlisted',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'true', label: 'Shortlisted' },
                { value: 'false', label: 'Pending' }
            ]
        });

        return configs;
    }, [drives, activeDrive, formFields]);

    // Dynamic labels for FilterChips
    const labels = useMemo(() => {
        const baseLabels = {
            driveId: 'Drive',
            isShortlisted: 'Status',
            search: 'Search'
        };

        if (formFields && formFields.length > 0) {
            formFields.forEach(field => {
                baseLabels[field.fieldId] = field.label;
                if (field.type === 'number' || field.type === 'cgpa') {
                    const pascalId = field.fieldId.charAt(0).toUpperCase() + field.fieldId.slice(1);
                    baseLabels[`min${pascalId}`] = `Min ${field.label}`;
                    baseLabels[`max${pascalId}`] = `Max ${field.label}`;
                }
            });
        }

        return baseLabels;
    }, [formFields]);


    // Theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const tblHdr = isDark ? 'bg-white/[0.02] text-white/30' : 'bg-gray-50 text-gray-500';
    const tblDivide = isDark ? 'divide-white/5' : 'divide-gray-100';
    const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50';
    const skel = isDark ? 'bg-white/5' : 'bg-gray-100';
    const inputCls = isDark ? 'bg-white/5 border-white/8 text-white placeholder:text-white/20 focus:border-rose-500/60 focus:ring-rose-500/20' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-400 focus:ring-rose-400/20';
    const filterBarBg = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const modalBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const modalHdr = isDark ? 'border-white/8 bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50';
    const overlay = 'bg-black/50 backdrop-blur-sm';
    const iconBtn = isDark ? 'text-white/30 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50';
    const iconBtnDanger = isDark ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const cancelBtn = isDark ? 'border-white/8 text-white/40 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50';
    const confirmDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const avatarBg = isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500';

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-5 ${card}`}>
                <div>
                    <h2 className={`text-xl font-bold ${h1}`}>Candidates</h2>
                    <p className={`text-[12px] mt-0.5 ${muted}`}>Manage and shortlist candidates across all drives</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportToExcel} disabled={!filters.driveId || candidates.length === 0}
                        className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-[12px] font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'border-white/8 text-white/60 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Download size={14} /><span>Export</span>
                    </button>
                    {totalCount > 0 && (
                        <button onClick={initiateShortlistAll}
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-lg text-[12px] font-semibold hover:bg-rose-600 transition-all active:scale-95 shadow-sm shadow-rose-500/20">
                            <Users size={14} /><span>Bulk Shortlist</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border rounded-2xl p-4 ${filterBarBg}`}>
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                    <input type="text" placeholder="Search by name, email or university..."
                        value={filters.search || ''} onChange={(e) => setFilter('search', e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                </div>
                <FilterPanel filters={filters} setFilter={setFilter} onClear={clearFilters} filterConfigs={filterConfigs} />
            </div>

            <FilterChips filters={filters} setFilter={setFilter} onClear={clearFilters} labels={labels} />

            {/* Table */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center justify-between ${sectionHdr}`}>
                    <div className="flex items-center gap-2">
                        <Users size={13} className="text-rose-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>All Candidates</span>
                        {totalCount > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{totalCount}</span>}
                    </div>
                    {isFetching && !isLoading && <div className="w-24 h-0.5 bg-rose-500 rounded-full animate-pulse" />}
                </div>

                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${tblDivide}`}>
                        <thead>
                            <tr className={tblHdr}>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Contact</th>
                                {tableColumns.map(col => (
                                    <th key={col.key} className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">{col.label}</th>
                                ))}
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${tblDivide}`}>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={tableColumns.length + 4} />)
                            ) : candidates.length === 0 ? (
                                <tr>
                                    <td colSpan={tableColumns.length + 4} className="py-20 text-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300'}`}><Users size={20} /></div>
                                        <p className={`text-[13px] font-semibold ${h1}`}>No candidates found</p>
                                        <p className={`text-[12px] mt-1 ${muted}`}>Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                candidates.map((candidate) => (
                                    <tr key={candidate._id} className={`transition-all duration-150 group cursor-default ${rowHover}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0 transition-transform group-hover:scale-105 ${avatarBg}`}>
                                                    {candidate.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors`}>{candidate.name}</p>
                                                    <p className={`text-[11px] ${muted}`}>{candidate.university || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className={`flex items-center gap-1.5 text-[11px] ${muted}`}><Mail size={11} className="text-rose-400" />{candidate.email}</div>
                                                <div className={`flex items-center gap-1.5 text-[11px] ${muted}`}><Phone size={11} />{candidate.contact || '—'}</div>
                                            </div>
                                        </td>
                                        {tableColumns.map(col => (
                                            <td key={col.key} className="px-6 py-4">{renderCellContent(candidate, col)}</td>
                                        ))}
                                        <td className="px-6 py-4">
                                            {candidate.isShortlisted ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wide border border-emerald-100">
                                                    <CheckCircle size={11} /> Shortlisted
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border ${isDark ? 'bg-white/5 border-white/8 text-white/30' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <Clock size={11} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!candidate.isShortlisted ? (
                                                <button onClick={() => initiateShortlist(candidate._id)} title="Shortlist"
                                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all active:scale-90 shadow-sm shadow-rose-500/20">
                                                    <CheckCircle size={15} />
                                                </button>
                                            ) : (
                                                <button onClick={() => initiateRevert(candidate._id)} title="Move to Pending"
                                                    className={`p-2 rounded-lg transition-all active:scale-90 ${iconBtnDanger}`}>
                                                    <XCircle size={15} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationFooter pagination={{ page, limit, total: totalCount, totalPages }} onPageChange={setPage} onLimitChange={setLimit} />
            </div>

            {/* Revert Modal */}
            {showRevertModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={cancelRevert} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100"><XCircle className="text-red-500" size={22} /></div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>Revert to Pending?</h3>
                            <p className={`text-[13px] ${muted}`}>This candidate will be removed from the shortlist and moved back to pending.</p>
                        </div>
                        <div className={`flex border-t ${confirmDivider}`}>
                            <button onClick={cancelRevert} className={`flex-1 py-3.5 text-[12px] font-medium border-r transition-all ${confirmDivider} ${isDark ? 'text-white/40 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50'}`}>Cancel</button>
                            <button onClick={confirmRevert} className="flex-1 py-3.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-all">Move to Pending</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shortlist Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlay}`} onClick={cancelShortlist} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${modalBg}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-rose-100"><Users className="text-rose-500" size={22} /></div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>{candidateToShortlist === 'ALL' ? 'Bulk Shortlist' : 'Shortlist Candidate'}</h3>
                            <p className={`text-[13px] ${muted}`}>
                                {candidateToShortlist === 'ALL'
                                    ? `Shortlist all ${totalCount} candidates matching current filters?`
                                    : 'Are you sure you want to shortlist this candidate?'}
                            </p>
                        </div>
                        <div className={`flex border-t ${confirmDivider}`}>
                            <button onClick={cancelShortlist} className={`flex-1 py-3.5 text-[12px] font-medium border-r transition-all ${confirmDivider} ${isDark ? 'text-white/40 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50'}`}>Cancel</button>
                            <button onClick={confirmShortlist} className="flex-1 py-3.5 text-[12px] font-semibold text-rose-500 hover:bg-rose-50 transition-all">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateList;
