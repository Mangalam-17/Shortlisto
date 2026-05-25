import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { Lock, Mail, ArrowRight, Check, Loader2 } from 'lucide-react';

/* ─── Animated counter ─── */
function useCounter(target, duration = 1400) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTime = null;
        const step = (ts) => {
            if (!startTime) startTime = ts;
            const p = Math.min((ts - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(ease * target));
            if (p < 1) requestAnimationFrame(step);
        };
        const raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return count;
}

const statItems = [
    { target: 500, suffix: '+', label: 'Companies' },
    { target: 50,  suffix: 'k+', label: 'Assessed' },
    { target: 98,  suffix: '%', label: 'Accuracy' },
];

/* ─── Stagger children variant ─── */
const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } }
};
const staggerItem = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const AdminLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [success, setSuccess]   = useState(false);
    const [shake, setShake]       = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;
    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Stat counters — start on mount
    const c1 = useCounter(statItems[0].target, 1400);
    const c2 = useCounter(statItems[1].target, 1600);
    const c3 = useCounter(statItems[2].target, 1200);
    const counters = [c1, c2, c3];

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            setSuccess(true);
            // Brief success state before navigating
            setTimeout(() => navigate('/admin'), 700);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length > 0) setError(data.errors[0].msg);
            else setError(data?.msg || 'Incorrect email or password');
            // Trigger shake
            setShake(true);
            setTimeout(() => setShake(false), 600);
        } finally {
            setLoading(false);
        }
    };

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
                {/* Ambient glow — breathing pulse */}
                <motion.div
                    className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-rose-500/12 rounded-full blur-[100px] pointer-events-none"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.2, 0.12] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-rose-700/8 rounded-full blur-[80px] pointer-events-none" />

                {/* Logo */}
                <motion.div className="relative z-10"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}>
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '140px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </motion.div>

                {/* Center content — staggered text */}
                <motion.div className="relative z-10"
                    variants={staggerContainer} initial="hidden" animate="visible">
                    <motion.p variants={staggerItem}
                        className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-5">
                        Admin Portal
                    </motion.p>
                    <motion.h1 variants={staggerItem}
                        className="text-4xl xl:text-5xl font-black tracking-tighter leading-[1.0] mb-5">
                        <span className="text-white">Hire Smarter.</span><br />
                        <span className="text-rose-500">Assess Faster.</span>
                    </motion.h1>
                    <motion.p variants={staggerItem}
                        className="text-white/35 text-[14px] leading-relaxed max-w-sm">
                        Manage your recruitment drives, assessments, and candidate pipeline — all from one dashboard.
                    </motion.p>
                </motion.div>

                {/* Bottom stats — counters */}
                <motion.div className="relative z-10 flex items-center gap-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                    {statItems.map((s, i) => (
                        <div key={s.label}>
                            <p className="text-lg font-black text-white tabular-nums">
                                {counters[i]}{s.suffix}
                            </p>
                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">{s.label}</p>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* ── RIGHT PANEL — slides in from right ── */}
            <motion.div
                className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-[#0d0d0d] border-l border-white/5"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Mobile logo */}
                <div className="lg:hidden mb-8">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '130px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>

                {/* Form content — staggered */}
                <motion.div
                    className="max-w-sm w-full mx-auto"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Heading */}
                    <motion.div variants={staggerItem} className="mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
                        <p className="text-white/40 text-[13px] mt-1">Sign in to your admin dashboard.</p>
                    </motion.div>

                    {/* Error message */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10"
                            >
                                <p className="text-[12px] font-medium text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form — shake on error */}
                    <motion.form
                        className="space-y-4"
                        onSubmit={onSubmit}
                        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <motion.div variants={staggerItem}>
                            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                <input type="email" name="email" value={email} onChange={onChange} required
                                    placeholder="admin@shortlisto.app" className={inputCls} />
                            </div>
                        </motion.div>

                        <motion.div variants={staggerItem}>
                            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                <input type="password" name="password" value={password} onChange={onChange} required
                                    placeholder="••••••••" className={inputCls} />
                            </div>
                        </motion.div>

                        {/* Submit button — loading + success states */}
                        <motion.div variants={staggerItem} className="pt-1">
                            <motion.button
                                type="submit"
                                disabled={loading || success}
                                className="group w-full flex items-center justify-center gap-2 py-3 font-semibold text-[13px] rounded-xl transition-colors disabled:cursor-not-allowed overflow-hidden relative"
                                style={{ background: success ? '#059669' : '#ffffff', color: success ? '#ffffff' : '#000000' }}
                                whileHover={!loading && !success ? { scale: 1.01 } : {}}
                                whileTap={!loading && !success ? { scale: 0.98 } : {}}
                                animate={loading ? { opacity: 0.85 } : { opacity: 1 }}
                            >
                                <AnimatePresence mode="wait">
                                    {success ? (
                                        <motion.span key="success" className="flex items-center gap-2"
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                                            <Check size={15} /> Signed in
                                        </motion.span>
                                    ) : loading ? (
                                        <motion.span key="loading" className="flex items-center gap-2"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <Loader2 size={14} className="animate-spin" /> Signing in...
                                        </motion.span>
                                    ) : (
                                        <motion.span key="idle" className="flex items-center gap-2"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            Continue to Dashboard
                                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </motion.div>
                    </motion.form>

                    <motion.p variants={staggerItem} className="mt-6 text-center text-[12px] text-white/30">
                        New to Shortlisto?{' '}
                        <button onClick={() => navigate('/admin/register')}
                            className="text-rose-500 hover:text-rose-400 font-semibold transition-colors">
                            Create an account
                        </button>
                    </motion.p>
                    <motion.p variants={staggerItem} className="mt-3 text-center">
                        <button onClick={() => navigate('/')}
                            className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
                            ← Back to home
                        </button>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
