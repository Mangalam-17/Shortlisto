import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { Lock, Mail, User, ArrowRight, AlertTriangle, Check, Loader2, CheckCircle2 } from 'lucide-react';

/* ─── Password strength ─── */
function getStrength(pw) {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 5)  score++;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak',   color: '#ef4444', pct: 20 };
    if (score <= 2) return { score, label: 'Fair',   color: '#f97316', pct: 45 };
    if (score <= 3) return { score, label: 'Good',   color: '#eab308', pct: 65 };
    if (score <= 4) return { score, label: 'Strong', color: '#22c55e', pct: 85 };
    return              { score, label: 'Very Strong', color: '#10b981', pct: 100 };
}

/* ─── Typewriter hook ─── */
function useTypewriter(text, speed = 60, startDelay = 500) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        setDisplayed(''); setDone(false);
        let i = 0;
        const t = setTimeout(() => {
            const iv = setInterval(() => {
                i++;
                setDisplayed(text.slice(0, i));
                if (i >= text.length) { clearInterval(iv); setDone(true); }
            }, speed);
            return () => clearInterval(iv);
        }, startDelay);
        return () => clearTimeout(t);
    }, [text, speed, startDelay]);
    return { displayed, done };
}

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};
const staggerItem = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const features = [
    'Unlimited candidate assessments',
    'Auto-proctored MCQ tests',
    'Instant ranked shortlists',
    'Deep analytics & insights',
];

const AdminRegister = () => {
    const [formData, setFormData]   = useState({ name: '', email: '', password: '' });
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [success, setSuccess]     = useState(false);
    const [shake, setShake]         = useState(false);
    const [pageState, setPageState] = useState('checking');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token');

    const { name, email, password } = formData;
    const strength = getStrength(password);

    // Typewriter for "in 5 minutes."
    const { displayed: typedText, done: typeDone } = useTypewriter('in 5 minutes.', 60, 600);

    useEffect(() => {
        const init = async () => {
            if (inviteToken) {
                try {
                    const res = await api.get(`/auth/validate-invite?token=${inviteToken}`);
                    if (res.data.valid) {
                        setFormData(prev => ({ ...prev, email: res.data.email }));
                        setPageState('invite-valid');
                    } else { setPageState('invite-invalid'); }
                } catch { setPageState('invite-invalid'); }
                return;
            }
            try {
                const res = await api.get('/auth/setup-status', {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
                    params: { _t: Date.now() }  // cache buster
                });
                setPageState(res.data.registrationOpen ? 'first-run' : 'closed');
            } catch {
                setPageState('first-run');
            }
        };
        init();
    }, [inviteToken]);

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const payload = { name, email, password };
            if (inviteToken) payload.inviteToken = inviteToken;
            const res = await api.post('/auth/register', payload);
            localStorage.setItem('token', res.data.token);
            setSuccess(true);
            setTimeout(() => navigate('/admin'), 800);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length > 0) setError(data.errors[0].msg);
            else setError(data?.msg || 'Registration failed. Please try again.');
            setShake(true);
            setTimeout(() => setShake(false), 600);
        } finally { setLoading(false); }
    };

    const isFormVisible = pageState === 'first-run' || pageState === 'invite-valid';
    const inputCls = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/15 transition-all duration-200";

    return (
        <div className="min-h-screen bg-[#080808] text-white flex overflow-hidden">

            {/* ── LEFT PANEL — slides in from left ── */}
            <motion.div
                className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Breathing ambient glow */}
                <motion.div
                    className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-rose-500/12 rounded-full blur-[100px] pointer-events-none"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.2, 0.12] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-blue-500/8 rounded-full blur-[80px] pointer-events-none" />

                {/* Logo */}
                <motion.div className="relative z-10"
                    initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}>
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '140px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </motion.div>

                {/* Center content */}
                <motion.div className="relative z-10"
                    variants={staggerContainer} initial="hidden" animate="visible">

                    <motion.p variants={staggerItem}
                        className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-5">
                        {pageState === 'invite-valid' ? 'Invite Accepted' : 'Get Started Free'}
                    </motion.p>

                    {/* Typewriter headline */}
                    <motion.h1 variants={staggerItem}
                        className="text-4xl xl:text-5xl font-black tracking-tighter leading-[1.0] mb-5">
                        <span className="text-white">Your first drive</span><br />
                        <span className="text-rose-500 min-h-[1.1em] block">
                            {typedText}
                            {!typeDone && (
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="inline-block w-[3px] h-[0.85em] bg-rose-500 ml-1 align-middle rounded-sm"
                                />
                            )}
                        </span>
                    </motion.h1>

                    <motion.p variants={staggerItem}
                        className="text-white/35 text-[14px] leading-relaxed max-w-sm mb-7">
                        Set up your account, create a recruitment drive, and start assessing candidates — all before your next meeting.
                    </motion.p>

                    {/* Feature list — staggered with pop */}
                    <div className="space-y-2.5">
                        {features.map((item, i) => (
                            <motion.div key={item}
                                className="flex items-center gap-2.5"
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.9 + i * 0.1, type: 'spring', stiffness: 400, damping: 15 }}>
                                    <CheckCircle2 size={13} className="text-rose-500 flex-shrink-0" />
                                </motion.div>
                                <span className="text-[13px] text-white/45">{item}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div className="relative z-10"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}>
                    <p className="text-[11px] text-white/20">No credit card required · Free to get started</p>
                </motion.div>
            </motion.div>

            {/* ── RIGHT PANEL — slides in from right ── */}
            <motion.div
                className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-[#0d0d0d] border-l border-white/5"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="lg:hidden mb-8">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '130px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>

                <motion.div
                    className="max-w-sm w-full mx-auto"
                    variants={staggerContainer} initial="hidden" animate="visible"
                >
                    {/* Heading */}
                    <motion.div variants={staggerItem} className="mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {pageState === 'invite-valid' ? 'Accept Invite' : pageState === 'closed' ? 'Access Restricted' : 'Create account'}
                        </h2>
                        <p className="text-white/40 text-[13px] mt-1 flex items-center gap-1.5">
                            {pageState === 'checking' && (
                                <><Loader2 size={11} className="animate-spin inline-block" /> Checking availability...</>
                            )}
                            {pageState === 'first-run'     && 'Set up your admin account to get started.'}
                            {pageState === 'invite-valid'  && 'Complete your account setup below.'}
                            {pageState === 'invite-invalid'&& 'This invite link is invalid or has expired.'}
                            {pageState === 'closed'        && 'Registration requires an invite from an existing admin.'}
                        </p>
                    </motion.div>

                    {/* Status banners */}
                    <AnimatePresence>
                        {pageState === 'invite-invalid' && (
                            <motion.div key="inv-invalid"
                                initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                                className="mb-5 p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-3">
                                <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[12px] font-semibold text-red-400">Invalid or Expired Invite</p>
                                    <p className="text-[12px] text-red-400/70 mt-0.5">Ask an admin to send a new invite link.</p>
                                </div>
                            </motion.div>
                        )}
                        {pageState === 'closed' && (
                            <motion.div key="closed"
                                initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                                className="mb-5 p-5 rounded-xl border border-amber-500/25 bg-amber-500/8 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertTriangle size={15} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-white">Invite Required</p>
                                        <p className="text-[12px] text-white/40 mt-1 leading-relaxed">
                                            An admin account already exists. New admins need an invite link sent by an existing admin.
                                        </p>
                                    </div>
                                </div>
                                <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                                    <button onClick={() => navigate('/admin/login')}
                                        className="w-full py-2.5 bg-white text-black text-[12px] font-semibold rounded-lg hover:bg-white/90 transition-all">
                                        Sign In Instead →
                                    </button>
                                    <p className="text-[11px] text-white/25 text-center">
                                        Already have an invite? Check your email for the invite link.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {error && (
                            <motion.div key="error"
                                initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                                className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10">
                                <p className="text-[12px] font-medium text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    {isFormVisible && (
                        <motion.form
                            className="space-y-4"
                            onSubmit={onSubmit}
                            animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                        >
                            {/* Name */}
                            <motion.div variants={staggerItem}>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="text" name="name" value={name} onChange={onChange} required
                                        placeholder="Your full name" className={inputCls} />
                                </div>
                            </motion.div>

                            {/* Email */}
                            <motion.div variants={staggerItem}>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Work Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="email" name="email" value={email} onChange={onChange} required
                                        placeholder="admin@shortlisto.app"
                                        readOnly={pageState === 'invite-valid'}
                                        className={`${inputCls} ${pageState === 'invite-valid' ? 'opacity-60 cursor-not-allowed' : ''}`} />
                                </div>
                                {pageState === 'invite-valid' && (
                                    <p className="text-[11px] text-white/20 mt-1">Email is locked to your invite.</p>
                                )}
                            </motion.div>

                            {/* Password + strength bar */}
                            <motion.div variants={staggerItem}>
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                    <input type="password" name="password" value={password} onChange={onChange} required minLength={5}
                                        placeholder="Min. 5 characters" className={inputCls} />
                                </div>
                                {/* Strength bar */}
                                <AnimatePresence>
                                    {password.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-2"
                                        >
                                            <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: strength.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${strength.pct}%` }}
                                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <motion.p
                                                    key={strength.label}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-[10px] font-semibold"
                                                    style={{ color: strength.color }}
                                                >
                                                    {strength.label}
                                                </motion.p>
                                                <p className="text-[10px] text-white/20">{password.length} chars</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Submit button */}
                            <motion.div variants={staggerItem} className="pt-1">
                                <motion.button
                                    type="submit"
                                    disabled={loading || success}
                                    className="group w-full flex items-center justify-center gap-2 py-3 font-semibold text-[13px] rounded-xl transition-colors disabled:cursor-not-allowed"
                                    style={{ background: success ? '#059669' : '#ffffff', color: success ? '#ffffff' : '#000000' }}
                                    whileHover={!loading && !success ? { scale: 1.01 } : {}}
                                    whileTap={!loading && !success ? { scale: 0.98 } : {}}
                                >
                                    <AnimatePresence mode="wait">
                                        {success ? (
                                            <motion.span key="success" className="flex items-center gap-2"
                                                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                                                <Check size={15} /> Account Created
                                            </motion.span>
                                        ) : loading ? (
                                            <motion.span key="loading" className="flex items-center gap-2"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Loader2 size={14} className="animate-spin" /> Creating Account...
                                            </motion.span>
                                        ) : (
                                            <motion.span key="idle" className="flex items-center gap-2"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                Create Account
                                                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            </motion.div>
                        </motion.form>
                    )}

                    <motion.p variants={staggerItem} className="mt-6 text-center text-[12px] text-white/30">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/admin/login')}
                            className="text-rose-500 hover:text-rose-400 font-semibold transition-colors">Sign in</button>
                    </motion.p>
                    <motion.p variants={staggerItem} className="mt-3 text-center">
                        <button onClick={() => navigate('/')}
                            className="text-[11px] text-white/20 hover:text-white/40 transition-colors">← Back to home</button>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AdminRegister;
