import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Save, Mail, Server, KeyRound, Shield, Send, Eye, EyeOff, UserPlus, Users, Trash2, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const inputCls = 'w-full bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#E11D48]/60 focus:ring-2 focus:ring-[#E11D48]/20 transition-all py-3';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2';
const sectionDivider = 'mt-8 pt-8 border-t border-white/8';

const Settings = () => {
    const { isDark } = useTheme();
    const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', pass: '' });
    const [hasPass, setHasPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testTo, setTestTo] = useState('');
    const [testing, setTesting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [invites, setInvites] = useState([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await api.get('/settings/email');
                setForm({ host: res.data.host || '', port: res.data.port || 587, secure: !!res.data.secure, user: res.data.user || '', pass: '' });
                setHasPass(!!res.data.hasPass);
            } catch (err) {
                toast.error(err.response?.data?.msg || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        try {
            setLoadingInvites(true);
            const res = await api.get('/auth/invites');
            setInvites(res.data);
        } catch { } finally { setLoadingInvites(false); }
    };

    const onSendInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        try {
            setInviting(true);
            await api.post('/auth/invite', { email: inviteEmail.trim() });
            toast.success(`Invite sent to ${inviteEmail}`);
            setInviteEmail('');
            fetchInvites();
        } catch (err) {
            const data = err.response?.data;
            const msg = data?.hint || data?.error || data?.msg || 'Failed to send invite';
            toast.error(msg, { duration: 8000 });
        } finally { setInviting(false); }
    };

    const onRevokeInvite = async (id, email) => {
        if (!window.confirm(`Revoke invite for ${email}?`)) return;
        try {
            await api.delete(`/auth/invites/${id}`);
            toast.success('Invite revoked');
            setInvites(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to revoke invite');
        }
    };

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'port') {
                const p = parseInt(value) || 587;
                if (p === 465) next.secure = true;
                if (p === 587) next.secure = false;
            }
            return next;
        });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { host: form.host, port: parseInt(form.port) || 587, secure: !!form.secure, user: form.user };
            if (form.pass?.length > 0) payload.pass = form.pass;
            await api.put('/settings/email', payload);
            toast.success('SMTP settings updated');
            if (form.pass) { setHasPass(true); setForm(prev => ({ ...prev, pass: '' })); }
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Save failed');
        } finally { setSaving(false); }
    };

    const onTest = async () => {
        try {
            setTesting(true);
            const recipient = (testTo || form.user || '').trim();
            if (!recipient) { toast.error('Enter a recipient email'); setTesting(false); return; }
            const res = await api.post('/settings/email/test', { to: recipient });
            toast.success(`Test email sent! (id: ${res.data.messageId})`);
        } catch (err) {
            const data = err.response?.data;
            const msg = data?.hint || data?.error || data?.msg || 'SMTP test failed';
            toast.error(msg, { duration: 8000 });
        } finally { setTesting(false); }
    };


    // Theme tokens
    const card = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const h1 = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const labelCls = `block text-[11px] font-semibold mb-1.5 ${muted}`;
    const inputCls = isDark
        ? 'w-full bg-white/5 border-white/8 text-white placeholder:text-white/20 focus:border-rose-500/60 focus:ring-rose-500/20 focus:ring-2 focus:outline-none border rounded-xl px-3.5 py-2.5 text-[13px] transition-all'
        : 'w-full bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-400 focus:ring-rose-400/20 focus:ring-2 focus:outline-none border rounded-xl px-3.5 py-2.5 text-[13px] transition-all';
    const sectionDivider = isDark ? 'border-white/8' : 'border-gray-100';
    const sectionHdr = isDark ? 'border-white/8 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50';
    const sectionTitle = isDark ? 'text-white/50' : 'text-gray-500';
    const iconBtn = isDark ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const inviteRow = isDark ? 'bg-white/[0.03] border-white/8' : 'bg-gray-50 border-gray-100';

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

            {/* Header */}
            <div className={`border rounded-2xl p-5 ${card}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                        <Shield size={17} className="text-rose-500" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${h1}`}>Settings</h2>
                        <p className={`text-[12px] mt-0.5 ${muted}`}>SMTP configuration and team management</p>
                    </div>
                </div>
            </div>

            {/* SMTP Config */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                    <Server size={13} className="text-blue-500" />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>SMTP Configuration</span>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelCls}>SMTP Host</label>
                            <div className="relative">
                                <Server size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                                <input type="text" name="host" value={form.host} onChange={onChange} disabled={loading}
                                    placeholder="smtp.gmail.com" className={`${inputCls} pl-9`} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Port</label>
                            <input type="number" name="port" value={form.port} onChange={onChange} disabled={loading}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Username (From)</label>
                            <div className="relative">
                                <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                                <input type="email" name="user" value={form.user} onChange={onChange} disabled={loading}
                                    placeholder="name@company.com" className={`${inputCls} pl-9`} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Password</label>
                            <div className="relative">
                                <KeyRound size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                                <input type={showPass ? 'text' : 'password'} name="pass" value={form.pass} onChange={onChange} disabled={loading}
                                    placeholder={hasPass ? '•••••••• (leave blank to keep)' : 'App password'}
                                    className={`${inputCls} pl-9 pr-10`} />
                                <button type="button" onClick={() => setShowPass(v => !v)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${muted} hover:text-rose-500`}>
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <p className={`mt-1 text-[11px] ${muted}`}>Leave empty to keep current password</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <input id="secure" type="checkbox" name="secure" checked={form.secure} onChange={onChange} disabled={loading}
                            className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer" />
                        <label htmlFor="secure" className={`text-[13px] font-medium cursor-pointer ${muted}`}>Enable TLS/SSL</label>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={saving || loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-rose-500/20">
                            <Save size={14} />{saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>

                {/* Test Email */}
                <div className={`px-6 pb-6 pt-5 border-t ${sectionDivider}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Send size={13} className="text-emerald-500" />
                        <span className={`text-[12px] font-semibold ${h1}`}>Send Test Email</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                            <input type="email" placeholder="recipient@example.com" value={testTo}
                                onChange={(e) => setTestTo(e.target.value)} className={`${inputCls} pl-9`} />
                        </div>
                        <button onClick={onTest} disabled={testing}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[13px] font-medium transition-all active:scale-95 disabled:opacity-50 ${isDark ? 'border-white/8 text-white/60 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <Send size={13} />{testing ? 'Sending...' : 'Send Test'}
                        </button>
                    </div>
                    <p className={`mt-1.5 text-[11px] ${muted}`}>Leave empty to use the username field above.</p>
                </div>
            </div>

            {/* Team & Invites */}
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
                <div className={`px-6 py-3.5 border-b flex items-center gap-2 ${sectionHdr}`}>
                    <Users size={13} className="text-rose-500" />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${sectionTitle}`}>Team & Invites</span>
                </div>
                <div className="p-6 space-y-5">
                    {/* Send invite */}
                    <form onSubmit={onSendInvite} className="flex gap-3">
                        <div className="relative flex-1">
                            <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                            <input type="email" placeholder="colleague@company.com" value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)} required
                                className={`${inputCls} pl-9`} />
                        </div>
                        <button type="submit" disabled={inviting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-semibold hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-rose-500/20">
                            <UserPlus size={14} />{inviting ? 'Sending...' : 'Invite'}
                        </button>
                    </form>
                    <p className={`text-[11px] ${muted} -mt-2`}>They'll receive a secure invite link valid for 48 hours.</p>

                    {/* Pending invites */}
                    {loadingInvites ? (
                        <p className={`text-[12px] ${muted}`}>Loading invites...</p>
                    ) : invites.length > 0 ? (
                        <div className="space-y-2">
                            <p className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>Pending Invites</p>
                            {invites.map((inv) => (
                                <div key={inv.id} className={`flex items-center justify-between p-3.5 border rounded-xl ${inviteRow}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.expired ? 'bg-red-400' : 'bg-amber-400'}`} />
                                        <div>
                                            <p className={`text-[13px] font-medium ${h1}`}>{inv.email}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={10} className={muted} />
                                                <p className={`text-[11px] ${muted}`}>{inv.expired ? 'Expired' : `Expires ${new Date(inv.expiry).toLocaleDateString()}`}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => onRevokeInvite(inv.id, inv.email)}
                                        className={`p-1.5 rounded-lg transition-all ${iconBtn}`} title="Revoke">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`text-[12px] ${muted}`}>No pending invites.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
