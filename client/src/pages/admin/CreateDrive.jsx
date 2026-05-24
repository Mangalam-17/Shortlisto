import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Users, FileText, Edit, Trash2, Link, Copy, Loader2, Code, Search } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, GripVertical, Settings2, Trash } from 'lucide-react';
import usePagination from '../../hooks/usePagination';
import PaginationFooter from '../../components/PaginationFooter';
import useDebounce from '../../hooks/useDebounce';
import { useTheme } from '../../context/ThemeContext';

const CAMPUS_TEMPLATE = [
    { fieldId: 'fullName', label: 'Full Name', type: 'text', required: true, section: 'personal' },
    { fieldId: 'email', label: 'Personal Email', type: 'email', required: true, section: 'personal' },
    { fieldId: 'phone', label: 'Contact Number', type: 'phone', required: true, section: 'personal' },
    { fieldId: 'whatsapp', label: 'WhatsApp Number', type: 'phone', required: false, section: 'personal' },
    { fieldId: 'university', label: 'University/College Name', type: 'text', required: true, section: 'academic' },
    { fieldId: 'educationLevel', label: 'Education Level', type: 'select', options: ['B.Tech', 'BCA', 'MCA', 'M.Tech', 'B.Sc'], required: true, section: 'academic' },
    { fieldId: 'yearOfStudy', label: 'Year of Study', type: 'select', options: ['1st', '2nd', '3rd', '4th'], required: true, section: 'academic' },
    { fieldId: 'semester', label: 'Semester', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8'], required: true, section: 'academic' },
    { fieldId: 'major', label: 'Major/Field of Study', type: 'text', required: true, section: 'academic' },
    { fieldId: 'cgpa', label: 'CGPA/Percentage (0-100)', type: 'number', required: true, section: 'academic', validation: { min: 0, max: 100 } },
    { fieldId: 'backlogs', label: 'Backlogs Status', type: 'select', options: ['Yes', 'No'], required: true, section: 'academic' },
    { fieldId: 'expectedGraduationYear', label: 'Expected Graduation Year', type: 'number', required: true, section: 'academic' }
];

const LATERAL_TEMPLATE = [
    { fieldId: 'fullName', label: 'Full Name', type: 'text', required: true, section: 'personal' },
    { fieldId: 'email', label: 'Personal Email', type: 'email', required: true, section: 'personal' },
    { fieldId: 'phone', label: 'Contact Number', type: 'phone', required: true, section: 'personal' },
    { fieldId: 'workExperience', label: 'Total Work Experience (Years)', type: 'number', required: true, section: 'professional' },
    { fieldId: 'currentCompany', label: 'Current/Previous Company', type: 'text', required: true, section: 'professional' },
    { fieldId: 'currentRole', label: 'Current Designation/Role', type: 'text', required: true, section: 'professional' },
    { fieldId: 'noticePeriod', label: 'Notice Period', type: 'select', options: ['Immediate', '30 Days', '60 Days', '90 Days'], required: true, section: 'professional' },
    { fieldId: 'currentCTC', label: 'Current CTC', type: 'number', required: true, section: 'professional' },
    { fieldId: 'expectedCTC', label: 'Expected CTC', type: 'number', required: true, section: 'professional' }
];

const CUSTOM_TEMPLATE = [
    { fieldId: 'fullName', label: 'Full Name', type: 'text', required: true, section: 'personal' },
    { fieldId: 'email', label: 'Personal Email', type: 'email', required: true, section: 'personal' },
    { fieldId: 'phone', label: 'Contact Number', type: 'phone', required: true, section: 'personal' }
];

const toSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')     // Replace non-alphanumeric characters with underscores
        .replace(/^_+|_+$/g, '');        // Remove leading/trailing underscores
};

const CreateDrive = () => {
    const { isDark } = useTheme();

    // Theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const cardHover = isDark ? 'hover:border-white/15' : 'hover:border-gray-300';
    const pageHdr = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const tblHdr = isDark ? 'bg-white/[0.02] text-white/30' : 'bg-gray-50 text-gray-500';
    const tblRow = isDark ? 'hover:bg-white/[0.03] divide-white/5' : 'hover:bg-gray-50 divide-gray-100';
    const tblDivide = isDark ? 'divide-white/5' : 'divide-gray-100';
    const inputCls = isDark
        ? 'bg-white/5 border-white/8 text-white placeholder:text-white/20 focus:border-rose-500/60 focus:ring-rose-500/20'
        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-400 focus:ring-rose-400/20';
    const selectCls = isDark
        ? 'bg-white/5 border-white/8 text-white/70 focus:ring-rose-500/20'
        : 'bg-white border-gray-200 text-gray-700 focus:ring-rose-400/20';
    const modalBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const modalHdr = isDark ? 'border-white/8 bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50';
    const modalHdrText = isDark ? 'text-white' : 'text-gray-900';
    const modalSubText = isDark ? 'text-white/40' : 'text-gray-500';
    const fieldRow = isDark ? 'bg-white/[0.03] border-white/8 hover:border-rose-500/40' : 'bg-gray-50 border-gray-200 hover:border-rose-300';
    const fieldText = isDark ? 'text-white/80' : 'text-gray-800';
    const fieldMeta = isDark ? 'bg-white/8 text-white/40' : 'bg-gray-200 text-gray-500';
    const skillTag = isDark ? 'bg-white/[0.03] border-white/8 text-white/70 hover:border-red-300 hover:text-red-500 hover:bg-red-50' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-500 hover:bg-red-50';
    const skillArea = isDark ? 'bg-white/[0.02] border-white/8' : 'bg-gray-50 border-gray-200';
    const sectionDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const sectionLabel = isDark ? 'text-white/60' : 'text-gray-600';
    const overlayBg = 'bg-black/50 backdrop-blur-sm';
    const confirmModal = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const confirmDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const cancelBtn = isDark ? 'text-white/30 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50';
    const skel = isDark ? 'bg-white/5' : 'bg-gray-100';
    const linkBox = isDark ? 'bg-white/5 border-white/8 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500';
    const iconBtn = isDark ? 'text-white/25 hover:text-rose-500 hover:bg-white/5' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50';
    const iconBtnDanger = isDark ? 'text-white/25 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const addFieldBtn = isDark ? 'border-white/10 text-white/30 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-500/5' : 'border-gray-200 text-gray-400 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50';
    const barTrack = isDark ? 'bg-white/8' : 'bg-gray-100';
    const emptyIcon = isDark ? 'bg-white/5 border-white/8 text-white/15' : 'bg-gray-50 border-gray-200 text-gray-300';
    const emptyText = isDark ? 'text-white' : 'text-gray-700';
    const emptyMuted = isDark ? 'text-white/30' : 'text-gray-400';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const { page, limit, setPage, setLimit } = usePagination(10);
    const [searchInput, setSearchInput] = useState('');
    const [typeInput, setTypeInput] = useState(''); // '', 'campus', 'lateral', 'custom'
    const [appliedSearch, setAppliedSearch] = useState('');
    const [appliedType, setAppliedType] = useState('');
    const debouncedSearch = useDebounce(searchInput, 300);

    useEffect(() => {
        setAppliedSearch(debouncedSearch.trim());
        setPage(1);
    }, [debouncedSearch, setPage]);

    useEffect(() => {
        setAppliedType(typeInput);
        setPage(1);
    }, [typeInput, setPage]);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        university: '',
        startTime: '',
        endTime: '',
        recruitmentType: 'campus',
        formConfig: {},
        formSchema: CAMPUS_TEMPLATE,
        skillsConfig: ['JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'Git']
    });
    const [newSkill, setNewSkill] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['drives-list', page, limit, appliedSearch, appliedType],
        queryFn: async () => {
            const res = await api.get('/drives', {
                params: { 
                    page, 
                    limit,
                    ...(appliedSearch ? { search: appliedSearch } : {}),
                    ...(appliedType ? { recruitmentType: appliedType } : {})
                }
            });
            return res.data;
        },
        keepPreviousData: true,
        retry: 2,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
        placeholderData: (previousData) => previousData
    });

    // Prefetch simple list for other pages - use staleTime 0 for instant display
    useQuery({
        queryKey: ['drives-list'],
        queryFn: async () => {
            const res = await api.get('/drives');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: false
    });

    const drives = data?.drives || [];
    const totalCount = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    useEffect(() => {
        // Remove all scroll locks completely - let CSS handle modal scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.height = '';
        document.body.style.touchAction = '';

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.height = '';
            document.body.style.touchAction = '';
        };
    }, []);

    const queryClient = useQueryClient();

    const createDriveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/drives', data);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Drive created successfully');
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                name: '',
                university: '',
                startTime: '',
                endTime: '',
                recruitmentType: 'campus',
                formConfig: {},
                formSchema: CAMPUS_TEMPLATE,
                skillsConfig: ['JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'Git']
            });
            queryClient.invalidateQueries({ queryKey: ['drives-list'] });
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.msg || 'Failed to create drive');
        }
    });

    const updateDriveMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.put(`/drives/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Drive updated successfully');
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                name: '',
                university: '',
                startTime: '',
                endTime: '',
                recruitmentType: 'campus',
                formConfig: {},
                formSchema: CAMPUS_TEMPLATE,
                skillsConfig: ['JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'Git']
            });
            queryClient.invalidateQueries({ queryKey: ['drives-list'] });
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.msg || 'Failed to update drive');
        }
    });

    const deleteDriveMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(`/drives/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Drive deleted successfully');
            setItemToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['drives-list'] });
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.msg || 'Failed to delete drive');
            setItemToDelete(null);
        }
    });

    const deleteAllDrivesMutation = useMutation({
        mutationFn: async () => {
            const res = await api.delete('/drives');
            return res.data;
        },
        onSuccess: () => {
            toast.success('All drives and associated data deleted successfully');
            setShowDeleteAllModal(false);
            queryClient.invalidateQueries({ queryKey: ['drives-list'] });
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.msg || 'Failed to delete all drives');
            setShowDeleteAllModal(false);
        }
    });

    // Convert UTC Date string to local ISO string (YYYY-MM-DDTHH:mm) for datetime-local input
    const toLocalISOString = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Correctly handle local timezone offset
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - tzOffset);
        return localDate.toISOString().slice(0, 16);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.university || !formData.startTime || !formData.endTime) {
            toast.error('Please fill all fields');
            return;
        }

        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);

        const submissionData = {
            ...formData,
            startTime: start.toISOString(),
            endTime: end.toISOString()
        };

        if (editingId) {
            updateDriveMutation.mutate({ id: editingId, data: submissionData });
        } else {
            createDriveMutation.mutate(submissionData);
        }
    };

    const handleEdit = (drive) => {
        setEditingId(drive._id);
        setFormData({
            name: drive.name,
            university: drive.university,
            startTime: toLocalISOString(drive.startTime),
            endTime: toLocalISOString(drive.endTime),
            recruitmentType: drive.recruitmentType || 'campus',
            formConfig: drive.formConfig || {},
            formSchema: drive.formSchema || (drive.recruitmentType === 'lateral' ? LATERAL_TEMPLATE : CAMPUS_TEMPLATE),
            skillsConfig: drive.skillsConfig || ['JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'Git']
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setItemToDelete(id);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            university: '',
            startTime: '',
            endTime: '',
            recruitmentType: 'campus',
            formConfig: {},
            formSchema: CAMPUS_TEMPLATE,
            skillsConfig: ['JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'Git']
        });
        setNewSkill('');
        setIsModalOpen(false);
    };

    const getDriveStatus = (startTime, endTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (now < start) {
            return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        } else if (now >= start && now <= end) {
            return { label: 'Live Now', color: 'bg-green-100 text-green-700 border-green-200' };
        } else {
            return { label: 'Ended', color: 'bg-white/8 text-white/70 border-slate-200' };
        }
    };

    const getAvatarColor = (university) => {
        const colors = [
            'bg-blue-500 text-white border-blue-600',
            'bg-green-500 text-white border-green-600',
            'bg-rose-500 text-white border-rose-600',
            'bg-red-500 text-white border-red-600',
            'bg-yellow-500 text-white border-yellow-600',
            'bg-pink-500 text-white border-pink-600',
            'bg-rose-500 text-white border-rose-600',
            'bg-teal-500 text-white border-teal-600'
        ];
        return colors[university?.length % colors.length || 0];
    };

    const getInitials = (text) => {
        return text?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-5 ${pageHdr}`}>
                <div>
                    <h2 className={`text-xl font-bold ${h1}`}>Drives</h2>
                    <p className={`text-[12px] mt-0.5 ${muted}`}>Create and manage your recruitment drives</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <select value={typeInput} onChange={(e) => setTypeInput(e.target.value)}
                            className={`appearance-none pl-3 pr-8 py-2 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 transition-all cursor-pointer ${selectCls}`}>
                            <option value="">All Types</option>
                            <option value="campus">Campus</option>
                            <option value="lateral">Lateral</option>
                            <option value="custom">Custom</option>
                        </select>
                        <Settings2 size={11} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${muted}`} />
                    </div>
                    <div className="relative">
                        <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} type="text"
                            placeholder="Search drives..."
                            className={`pl-9 pr-4 py-2 border rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 transition-all w-52 ${inputCls}`} />
                    </div>
                    {drives.length > 0 && (
                        <button onClick={() => setShowDeleteAllModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-medium hover:bg-red-100 transition-all active:scale-95">
                            <Trash size={13} /><span>Delete All</span>
                        </button>
                    )}
                    <button onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-lg text-[12px] font-semibold hover:bg-rose-600 transition-all active:scale-95 shadow-sm shadow-rose-500/20">
                        <Plus size={14} /><span>New Drive</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center gap-2">
                        <FileText size={13} className="text-rose-500" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>All Drives</span>
                        {totalCount > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'}`}>{totalCount}</span>}
                    </div>
                    {isLoading && <Loader2 className="animate-spin text-rose-500" size={13} />}
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => <div key={i} className={`h-14 rounded-xl animate-pulse ${skel}`} />)}
                    </div>
                ) : isError ? (
                    <div className="py-20 text-center">
                        <p className="text-red-500 font-medium">Failed to load drives</p>
                        <button onClick={() => window.location.reload()} className="mt-3 text-[12px] text-rose-500 hover:text-rose-600 font-medium">Refresh</button>
                    </div>
                ) : drives.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${emptyIcon}`}><FileText size={20} /></div>
                        <p className={`text-[13px] font-semibold ${emptyText}`}>No drives yet</p>
                        <p className={`text-[12px] mt-1 ${emptyMuted}`}>Create your first recruitment drive to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${tblDivide}`}>
                            <thead>
                                <tr className={tblHdr}>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Drive & Institution</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Registration Link</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Registered</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Yield</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${tblDivide}`}>
                                {drives.map((drive) => {
                                    const status = getDriveStatus(drive.startTime, drive.endTime);
                                    const avatarStyle = getAvatarColor(drive.university);
                                    const yieldPercent = drive.candidateCount > 0 ? (drive.shortlistedCount / drive.candidateCount) * 100 : 0;
                                    return (
                                        <tr key={drive._id} className={`transition-all duration-150 group cursor-default ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform group-hover:scale-105 ${avatarStyle}`}>
                                                        {getInitials(drive.university)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[13px] font-semibold ${h1} group-hover:text-rose-500 transition-colors`}>{drive.name}</p>
                                                        <p className={`text-[11px] ${muted}`}>{drive.university}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border max-w-[160px] ${linkBox}`}>
                                                        <Link size={11} className="text-rose-500 flex-shrink-0" />
                                                        <span className="text-[10px] truncate">{`/register/${drive._id.slice(-8)}`}</span>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/register/${drive._id}`); toast.success('Link copied'); }}
                                                        className={`p-1.5 rounded-lg transition-all ${iconBtn}`} title="Copy Link">
                                                        <Copy size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wide w-fit ${status.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.label === 'Live Now' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-50'}`} />
                                                        {status.label}
                                                    </span>
                                                    <span className={`text-[11px] ${muted}`}>{formatDate(drive.startTime)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[18px] font-bold ${h1}`}>{drive.candidateCount || 0}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center gap-1 max-w-[100px] mx-auto">
                                                    <div className="flex justify-between w-full">
                                                        <span className="text-[11px] font-semibold text-emerald-500">{drive.shortlistedCount || 0}</span>
                                                        <span className={`text-[11px] ${muted}`}>{yieldPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className={`w-full h-1.5 ${barTrack} rounded-full overflow-hidden`}>
                                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(yieldPercent, yieldPercent > 0 ? 3 : 0)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleEdit(drive)} className={`p-2 rounded-lg transition-all ${iconBtn}`} title="Edit">
                                                        <Edit size={15} />
                                                    </button>
                                                    <button onClick={() => handleDelete(drive._id)} className={`p-2 rounded-lg transition-all ${iconBtnDanger}`} title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
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

            {/* Delete single modal */}
            {itemToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlayBg}`} onClick={() => setItemToDelete(null)} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${confirmModal}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <Trash2 className="text-red-500" size={22} />
                            </div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>Delete this Drive?</h3>
                            <p className={`text-[13px] ${muted}`}>All registered candidates and data for this drive will be permanently deleted.</p>
                        </div>
                        <div className={`flex border-t ${confirmDivider}`}>
                            <button onClick={() => setItemToDelete(null)} className={`flex-1 py-3.5 text-[12px] font-medium border-r transition-all ${confirmDivider} ${cancelBtn}`}>Cancel</button>
                            <button onClick={() => deleteDriveMutation.mutate(itemToDelete)} disabled={deleteDriveMutation.isPending}
                                className="flex-1 py-3.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {deleteDriveMutation.isPending ? <><Loader2 className="animate-spin" size={13} /><span>Deleting...</span></> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete all modal */}
            {showDeleteAllModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlayBg}`} onClick={() => setShowDeleteAllModal(false)} />
                    <div className={`relative z-10 w-full max-w-sm rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${confirmModal}`}>
                        <div className="p-7 text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <Trash className="text-red-500" size={22} />
                            </div>
                            <h3 className={`text-[16px] font-bold mb-2 ${h1}`}>Delete All Drives?</h3>
                            <p className={`text-[13px] ${muted}`}>This will permanently delete <strong className="text-red-500">all</strong> drives and their associated data.</p>
                        </div>
                        <div className={`flex border-t ${confirmDivider}`}>
                            <button onClick={() => setShowDeleteAllModal(false)} className={`flex-1 py-3.5 text-[12px] font-medium border-r transition-all ${confirmDivider} ${cancelBtn}`}>Cancel</button>
                            <button onClick={() => deleteAllDrivesMutation.mutate()} disabled={deleteAllDrivesMutation.isPending}
                                className="flex-1 py-3.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {deleteAllDrivesMutation.isPending ? <><Loader2 className="animate-spin" size={13} /><span>Deleting...</span></> : 'Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${overlayBg}`} onClick={resetForm} />
                    <div className={`relative z-10 w-full max-w-2xl rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col ${modalBg}`}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between flex-shrink-0 ${modalHdr}`}>
                            <div>
                                <h3 className={`text-[16px] font-bold ${modalHdrText}`}>{editingId ? 'Edit Drive' : 'Create New Drive'}</h3>
                                <p className={`text-[12px] mt-0.5 ${modalSubText}`}>Fill in the details below</p>
                            </div>
                            <button onClick={resetForm} className={`p-2 rounded-lg transition-all ${iconBtn}`}><X size={16} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Drive Name', key: 'name', placeholder: 'e.g. Frontend Engineer Drive' },
                                    { label: formData.recruitmentType === 'lateral' ? 'Company' : 'University', key: 'university', placeholder: formData.recruitmentType === 'lateral' ? 'Company name' : 'University name' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>{f.label}</label>
                                        <input type="text" value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                            placeholder={f.placeholder} required
                                            className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                                    </div>
                                ))}
                                {[
                                    { label: 'Start Date & Time', key: 'startTime' },
                                    { label: 'End Date & Time', key: 'endTime' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>{f.label}</label>
                                        <input type="datetime-local" value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} required
                                            className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                                    </div>
                                ))}
                            </div>
                            <div className={`pt-5 border-t ${sectionDivider}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <h4 className={`text-[12px] font-semibold ${sectionLabel}`}>Application Form Builder</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            { label: 'Campus', type: 'campus', schema: CAMPUS_TEMPLATE, cls: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
                                            { label: 'Lateral', type: 'lateral', schema: LATERAL_TEMPLATE, cls: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
                                            { label: 'Custom', type: 'custom', schema: CUSTOM_TEMPLATE, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
                                        ].map(t => (
                                            <button key={t.type} type="button"
                                                onClick={() => setFormData({ ...formData, formSchema: t.schema, recruitmentType: t.type })}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${t.cls} ${formData.recruitmentType === t.type ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                    {formData.formSchema.map((field, index) => (
                                        <div key={index} className={`flex items-center gap-3 p-3.5 border rounded-xl transition-all ${fieldRow}`}>
                                            <GripVertical size={14} className={`${muted} cursor-grab flex-shrink-0`} />
                                            <div className="flex-1 min-w-0">
                                                <input type="text" value={field.label}
                                                    onChange={(e) => {
                                                        const s = [...formData.formSchema];
                                                        s[index].label = e.target.value;
                                                        if (!['fullName','email','phone','university','cgpa'].includes(s[index].fieldId)) {
                                                            const slug = toSlug(e.target.value);
                                                            if (slug) s[index].fieldId = slug;
                                                        }
                                                        setFormData({ ...formData, formSchema: s });
                                                    }}
                                                    className={`w-full bg-transparent border-none p-0 text-[13px] font-medium focus:ring-0 outline-none ${fieldText}`}
                                                    placeholder="Field Label" />
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${fieldMeta}`}>{field.type}</span>
                                                    <span className={`text-[9px] ${muted}`}>id: {field.fieldId}</span>
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                                                <input type="checkbox" checked={field.required}
                                                    onChange={(e) => { const s = [...formData.formSchema]; s[index].required = e.target.checked; setFormData({ ...formData, formSchema: s }); }}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer" />
                                                <span className={`text-[10px] font-medium ${muted}`}>Required</span>
                                            </label>
                                            <button type="button" onClick={() => setFormData({ ...formData, formSchema: formData.formSchema.filter((_, i) => i !== index) })}
                                                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${iconBtnDanger}`}>
                                                <Trash size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button"
                                    onClick={() => { const f = { fieldId: 'new_field_' + Date.now().toString().slice(-4), label: 'New Field', type: 'text', required: false, section: 'custom' }; setFormData({ ...formData, formSchema: [...formData.formSchema, f] }); }}
                                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-[12px] font-medium transition-all ${addFieldBtn}`}>
                                    <Plus size={14} /> Add Field
                                </button>
                            </div>
                            <div className={`pt-5 border-t ${sectionDivider}`}>
                                <h4 className={`text-[12px] font-semibold mb-3 ${sectionLabel}`}>Required Skills</h4>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const s = newSkill.trim(); if (s && !formData.skillsConfig.includes(s)) { setFormData({ ...formData, skillsConfig: [...formData.skillsConfig, s] }); setNewSkill(''); } } }}
                                        placeholder="Add a skill (press Enter)"
                                        className={`flex-1 px-3.5 py-2.5 border rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                                    <button type="button"
                                        onClick={() => { const s = newSkill.trim(); if (s && !formData.skillsConfig.includes(s)) { setFormData({ ...formData, skillsConfig: [...formData.skillsConfig, s] }); setNewSkill(''); } }}
                                        className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-[12px] font-semibold hover:bg-rose-600 transition-all">Add</button>
                                </div>
                                <div className={`flex flex-wrap gap-2 min-h-[60px] p-3 border-2 border-dashed rounded-xl ${skillArea}`}>
                                    {formData.skillsConfig.map((skill, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-medium transition-all ${skillTag}`}>
                                            {skill}
                                            <button type="button" onClick={() => setFormData({ ...formData, skillsConfig: formData.skillsConfig.filter((_, j) => j !== i) })}
                                                className="hover:text-red-500 transition-colors"><X size={11} /></button>
                                        </span>
                                    ))}
                                    {formData.skillsConfig.length === 0 && <p className={`text-[12px] ${muted} m-auto`}>No skills added yet</p>}
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0 ${modalHdr}`}>
                            <button type="button" onClick={resetForm}
                                className={`px-5 py-2.5 border rounded-xl text-[13px] font-medium transition-all ${isDark ? 'border-white/8 text-white/50 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                Cancel
                            </button>
                            <button type="button" onClick={handleSubmit}
                                disabled={createDriveMutation.isPending || updateDriveMutation.isPending}
                                className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-rose-500/20">
                                {(createDriveMutation.isPending || updateDriveMutation.isPending)
                                    ? <><Loader2 className="animate-spin" size={14} /><span>{editingId ? 'Updating...' : 'Creating...'}</span></>
                                    : <span>{editingId ? 'Update Drive' : 'Create Drive'}</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateDrive;
