import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { Lock, Mail, User, ArrowRight, AlertTriangle } from 'lucide-react';

const AdminRegister = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageState, setPageState] = useState('checking');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token');

    const { name, email, password } = formData;

    useEffect(() => {
        const init = async () => {
            if (inviteToken) {
                try {
                    const res = await api.get(`/auth/validate-invite?token=${inviteToken}`);
                    if (res.data.valid) {
                        setFormData(prev => ({ ...prev, email: res.data.email }));
                        setPageState('invite-valid');
                    } else {
                        setPageState('invite-invalid');
                    }
                } catch {
                    setPageState('invite-invalid');
                }
                return;
            }
            try {
                const res = await api.get('/auth/setup-status');
                setPageState(res.data.registrationOpen ? 'first-run' : 'closed');
            } catch {
                setPageState('closed');
            }
        };
        init();
    }, [inviteToken]);

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { name, email, password };
            if (inviteToken) payload.inviteToken = inviteToken;
            const res = await api.post('/auth/register', payload);
            localStorage.setItem('token', res.data.token);
            navigate('/admin');
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length > 0) setError(data.errors[0].msg);
            else setError(data?.msg || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isFormVisible = pageState === 'first-run' || pageState === 'invite-valid';
    const inputCls = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/15 transition-all";

    return (
        <div className="min-h-screen bg-[#080808] text-white flex overflow-hidden">

            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
                <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-rose-500/12 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-blue-500/8 rounded-full blur-[80px] pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '140px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>

                {/* Center content */}
                <div className="relative z-10">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-5">
                        {pageState === 'invite-valid' ? 'Invite Accepted' : 'Get Started Free'}
                    </p>
                    <h1 className="text-4xl xl:text-5xl font-black tracking-tighter leading-[1.0] mb-5">
                        <span className="text-white">Your first drive</span><br />
                        <span className="text-rose-500">in 5 minutes.</span>
                    </h1>
                    <p className="text-white/35 text-[14px] leading-relaxed max-w-sm mb-7">
                        Set up your account, create a recruitment drive, and start assessing candidates — all before your next meeting.
                    </p>
                    <div className="space-y-2.5">
                        {['Unlimited candidate assessments', 'Auto-proctored MCQ tests', 'Instant ranked shortlists', 'Deep analytics & insights'].map(item => (
                            <div key={item} className="flex items-center gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                                <span className="text-[13px] text-white/45">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-[11px] text-white/20">No credit card required · Free to get started</p>
                </div>
            </div>

            {/* Right — Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-[#0d0d0d] border-l border-white/5">

                {/* Mobile logo */}
                <div className="lg:hidden mb-8">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '130px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>

                <div className="max-w-sm w-full mx-auto">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {pageState === 'invite-valid' ? 'Accept Invite' : 'Create account'}
                        </h2>
                        <p className="text-white/40 text-[13px] mt-1">
                            {pageState === 'checking' && 'Checking availability...'}
                            {pageState === 'first-run' && 'Set up your admin account to get started.'}
                            {pageState === 'invite-valid' && 'Complete your account setup below.'}
                            {pageState === 'invite-invalid' && 'This invite link is invalid or has expired.'}
                            {pageState === 'closed' && 'Registration requires an invite from an existing admin.'}
                        </p>
                    </div>

                    {/* Invalid invite */}
                    {pageState === 'invite-invalid' && (
                        <div className="mb-5 p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-3">
                            <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-[12px] font-semibold text-red-400">Invalid or Expired Invite</p>
                                <p className="text-[12px] text-red-400/70 mt-0.5">Ask an admin to send a new invite link.</p>
                            </div>
                        </div>
                    )}

                    {/* Closed */}
                    {pageState === 'closed' && (
                        <div className="mb-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10">
                            <p className="text-[12px] font-semibold text-amber-400">Invite Required</p>
                            <p className="text-[12px] text-amber-400/70 mt-0.5">An admin account already exists. You need an invite link to register.</p>
                            <button onClick={() => navigate('/admin/login')} className="mt-2.5 text-[11px] font-semibold text-rose-500 hover:text-rose-400 transition-colors underline underline-offset-4">
                                Go to Sign In →
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10">
                            <p className="text-[12px] font-medium text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    {isFormVisible && (
                        <form className="space-y-4" onSubmit={onSubmit}>
                            <div>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="text" name="name" value={name} onChange={onChange} required
                                        placeholder="Your full name" className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Work Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="email" name="email" value={email} onChange={onChange} required
                                        placeholder="admin@shortlisto.app"
                                        readOnly={pageState === 'invite-valid'}
                                        className={`${inputCls} ${pageState === 'invite-valid' ? 'opacity-60 cursor-not-allowed' : ''}`} />
                                </div>
                                {pageState === 'invite-valid' && <p className="text-[11px] text-white/20 mt-1">Email is locked to your invite.</p>}
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="password" name="password" value={password} onChange={onChange} required minLength={5}
                                        placeholder="Min. 5 characters" className={inputCls} />
                                </div>
                            </div>
                            <div className="pt-1">
                                <button type="submit" disabled={loading}
                                    className="group w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-semibold text-[13px] rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50">
                                    {loading ? 'Creating Account...' : <><span>Create Account</span><ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    <p className="mt-6 text-center text-[12px] text-white/30">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/admin/login')} className="text-rose-500 hover:text-rose-400 font-semibold transition-colors">Sign in</button>
                    </p>
                    <p className="mt-3 text-center">
                        <button onClick={() => navigate('/')} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">← Back to home</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminRegister;
