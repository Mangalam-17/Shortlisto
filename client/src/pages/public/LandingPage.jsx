import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView as useFramerInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart3, Users, FileText, Clock, ChevronRight } from 'lucide-react';

/* ─── Typewriter hook ─── */
function useTypewriter(text, speed = 55, startDelay = 600) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        setDisplayed('');
        setDone(false);
        let i = 0;
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                i++;
                setDisplayed(text.slice(0, i));
                if (i >= text.length) { clearInterval(interval); setDone(true); }
            }, speed);
            return () => clearInterval(interval);
        }, startDelay);
        return () => clearTimeout(timeout);
    }, [text, speed, startDelay]);
    return { displayed, done };
}

/* ─── Animated counter ─── */
function useCounter(target, duration = 1600, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime = null;
        const step = (ts) => {
            if (!startTime) startTime = ts;
            const p = Math.min((ts - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(ease * target));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, start]);
    return count;
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.3) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

/* ─── Scroll-triggered section wrapper ─── */
function ScrollReveal({ children, delay = 0, className = '' }) {
    const ref = useRef(null);
    const inView = useFramerInView(ref, { once: true, margin: '-60px' });
    return (
        <motion.div
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
        >
            {children}
        </motion.div>
    );
}

const stats = [
    { value: 500, suffix: '+', label: 'Companies' },
    { value: 50000, suffix: '+', label: 'Candidates Assessed' },
    { value: 98, suffix: '%', label: 'Accuracy Rate' },
    { value: 10, suffix: 'x', label: 'Faster Shortlisting' },
];

const features = [
    { icon: <FileText size={18} />, title: 'Drive Management', desc: 'Create recruitment drives in minutes with custom forms and skill configs.', color: '#E11D48' },
    { icon: <Shield size={18} />, title: 'Proctored Assessments', desc: 'Auto-proctored MCQ tests with tab-switch detection and behavior analysis.', color: '#2563EB' },
    { icon: <Zap size={18} />, title: 'Instant Shortlisting', desc: 'Auto-scored results with ranked candidates ready the moment the test ends.', color: '#059669' },
    { icon: <BarChart3 size={18} />, title: 'Deep Analytics', desc: 'Score distributions, question difficulty, and proctoring flags — all visualized.', color: '#D97706' },
    { icon: <Users size={18} />, title: 'Candidate Pipeline', desc: 'Track every candidate from registration to result. Filter, sort, export.', color: '#7C3AED' },
    { icon: <Clock size={18} />, title: 'Scheduled Tests', desc: 'Set start times, auto-open and auto-close assessments without manual work.', color: '#0891B2' },
];

const steps = [
    { n: '01', title: 'Create a Drive', desc: 'Set up your campaign, upload questions, configure the assessment rules.' },
    { n: '02', title: 'Candidates Test', desc: 'Share the link. Candidates register, receive credentials, and take the proctored test.' },
    { n: '03', title: 'Get Your Shortlist', desc: 'Scores calculated instantly. You get a ranked shortlist with proctoring insights.' },
];

/* ─── Dashboard mock numbers ─── */
const dashStats = [
    { label: 'Recruitment Drives', val: 12, change: '+3 this week' },
    { label: 'Active Candidates',  val: 248, change: '+24 this week' },
    { label: 'Shortlisted',        val: 67, change: '+12 this week' },
    { label: 'Assessments',        val: 8, change: '+2 this week' },
];

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (delay = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }
    })
};

export default function LandingPage() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Set page title and meta description for this route
    useEffect(() => {
        document.title = 'Shortlisto — Smart Recruitment & Online Assessment Platform';
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute('content', 'Shortlisto is a recruitment management and online assessment platform. Create drives, conduct proctored MCQ tests, auto-score results, and get ranked shortlists instantly.');
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', 'https://shortlisto.vercel.app/');
    }, []);

    // Navbar scroll detection
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Stats section
    const [statsRef, statsInView] = useInView(0.4);
    const c1 = useCounter(stats[0].value, 1400, statsInView);
    const c2 = useCounter(stats[1].value, 1800, statsInView);
    const c3 = useCounter(stats[2].value, 1200, statsInView);
    const c4 = useCounter(stats[3].value, 1000, statsInView);
    const counters = [c1, c2, c3, c4];

    // Dashboard
    const dashboardRef = useRef(null);
    const dashboardInView = useFramerInView(dashboardRef, { once: true, margin: '-80px' });

    // Dashboard number tickers (fire when dashboard enters view)
    const d1 = useCounter(dashStats[0].val, 1200, dashboardInView);
    const d2 = useCounter(dashStats[1].val, 1600, dashboardInView);
    const d3 = useCounter(dashStats[2].val, 1400, dashboardInView);
    const d4 = useCounter(dashStats[3].val, 1000, dashboardInView);
    const dashCounters = [d1, d2, d3, d4];

    // Typewriter
    const { displayed: typedText, done: typeDone } = useTypewriter('Assess Faster.', 55, 500);

    // Shimmer fires after typewriter finishes
    const [shimmer, setShimmer] = useState(false);
    useEffect(() => { if (typeDone) setTimeout(() => setShimmer(true), 200); }, [typeDone]);

    return (
        <div className="bg-[#080808] text-white min-h-screen font-sans overflow-x-hidden">

            {/* ── NAVBAR — scroll-aware ── */}
            <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'border-b border-white/8 bg-[#080808]/95 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.4)]'
                        : 'border-b border-transparent bg-transparent'
                }`}
            >
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '130px' }} className="h-auto object-contain" />
                    <div className="hidden md:flex items-center space-x-7">
                        {['Features', 'How it works', 'Why Shortlisto'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                                className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">{l}</a>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={() => navigate('/admin/login')}
                            className="text-[13px] font-medium text-white/60 hover:text-white transition-colors px-3 py-1.5">Sign In</button>
                        <button onClick={() => navigate('/admin/register')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-white/90 transition-all active:scale-95">
                            Get Started <ArrowRight size={13} />
                        </button>
                    </div>
                    <button className="md:hidden p-2 text-white/50" onClick={() => setMenuOpen(!menuOpen)}>
                        <div className="space-y-1.5">{[0,1,2].map(i => <span key={i} className="block w-5 h-0.5 bg-current" />)}</div>
                    </button>
                </div>
                {menuOpen && (
                    <div className="md:hidden border-t border-white/5 bg-[#080808] px-6 py-4 space-y-3">
                        {['Features', 'How it works', 'Why Shortlisto'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                                className="block text-[13px] text-white/60 hover:text-white" onClick={() => setMenuOpen(false)}>{l}</a>
                        ))}
                        <div className="pt-2 flex flex-col gap-2">
                            <button onClick={() => navigate('/admin/login')} className="w-full py-2.5 border border-white/10 rounded-lg text-[13px] font-medium text-white/60">Sign In</button>
                            <button onClick={() => navigate('/admin/register')} className="w-full py-2.5 bg-white rounded-lg text-[13px] font-semibold text-black">Get Started</button>
                        </div>
                    </div>
                )}
            </motion.nav>

            {/* ── HERO ── */}
            <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-500/8 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.0] mb-5">
                        <motion.span className="block text-white" variants={fadeUp} initial="hidden" animate="visible" custom={0.1}>
                            Hire Smarter.
                        </motion.span>

                        {/* Typewriter line with shimmer after done */}
                        <span
                            className="block min-h-[1.1em] relative"
                            style={shimmer ? {
                                background: 'linear-gradient(90deg, #E11D48 0%, #E11D48 30%, #ff6b8a 50%, #E11D48 70%, #E11D48 100%)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                animation: 'shimmer 2.5s linear infinite',
                            } : { color: '#E11D48' }}
                        >
                            {typedText}
                            {!typeDone && (
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="inline-block w-[3px] h-[0.85em] bg-rose-500 ml-1 align-middle rounded-sm"
                                />
                            )}
                        </span>
                    </h1>

                    <motion.p className="text-white/50 text-[15px] md:text-[16px] max-w-xl mx-auto leading-relaxed mb-8"
                        variants={fadeUp} initial="hidden" animate="visible" custom={0.7}>
                        Shortlisto automates your recruitment pipeline — from drive creation to ranked shortlists — so your team focuses on people, not process.
                    </motion.p>

                    <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
                        variants={fadeUp} initial="hidden" animate="visible" custom={0.85}>
                        <button onClick={() => navigate('/admin/register')}
                            className="group flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-[14px] rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/10">
                            Start for Free <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={() => navigate('/admin/login')}
                            className="flex items-center gap-2 px-6 py-3 border border-white/10 text-white/60 font-medium text-[14px] rounded-xl hover:border-white/20 hover:text-white transition-all">
                            Sign In <ChevronRight size={14} />
                        </button>
                    </motion.div>

                    <motion.div className="flex items-center justify-center gap-5 flex-wrap"
                        variants={fadeUp} initial="hidden" animate="visible" custom={1.0}>
                        {['No credit card required', 'Setup in 5 minutes', 'Cancel anytime'].map(t => (
                            <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/30">
                                <CheckCircle2 size={12} className="text-emerald-500" />{t}
                            </span>
                        ))}
                    </motion.div>
                </div>

                {/* ── Dashboard mockup float-up with number tickers ── */}
                <motion.div ref={dashboardRef} className="relative z-10 mt-14 max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 60 }}
                    animate={dashboardInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
                    <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/10" />)}
                            <div className="ml-3 h-4 w-40 rounded bg-white/5" />
                        </div>
                        <div className="p-5 grid grid-cols-4 gap-3">
                            {dashStats.map(({ label, change }, i) => (
                                <motion.div key={label} className="rounded-xl bg-white/[0.04] border border-white/5 p-3.5"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={dashboardInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 + i * 0.08 }}>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">{label}</p>
                                    <p className="text-xl font-black text-white tabular-nums">{dashCounters[i]}</p>
                                    <p className="text-[10px] text-emerald-400 mt-1">↑ {change}</p>
                                </motion.div>
                            ))}
                        </div>
                        <div className="px-5 pb-5 grid grid-cols-3 gap-3">
                            {[['Frontend Engineer Drive','48 candidates','Live'],['Backend Assessment','32 candidates','Scheduled'],['Data Analyst Batch','61 candidates','Ended']].map(([name, count, status], i) => (
                                <motion.div key={name} className="rounded-xl bg-white/[0.04] border border-white/5 p-3.5 flex items-center justify-between"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={dashboardInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.55 + i * 0.08 }}>
                                    <div>
                                        <p className="text-[11px] font-semibold text-white/70">{name}</p>
                                        <p className="text-[10px] text-white/30 mt-0.5">{count}</p>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${status === 'Live' ? 'bg-emerald-500/15 text-emerald-400' : status === 'Scheduled' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-white/30'}`}>{status}</span>
                                </motion.div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
                    </div>
                </motion.div>
            </section>

            {/* ── STATS ── */}
            <section ref={statsRef} className="py-12 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {stats.map((s, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={statsInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.1 }}>
                            <p className="text-3xl font-black text-white tabular-nums">{counters[i].toLocaleString()}{s.suffix}</p>
                            <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal className="text-center mb-12">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">Features</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                            Everything you need.<br /><span className="text-white/30">Nothing you don't.</span>
                        </h2>
                    </ScrollReveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((f, i) => (
                            <ScrollReveal key={i} delay={i * 0.07}>
                                {/* Feature card with hover glow */}
                                <motion.div
                                    className="group relative p-5 rounded-2xl border border-white/8 bg-white/[0.02] cursor-default h-full"
                                    whileHover={{ y: -4, borderColor: `${f.color}40` }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    style={{ '--glow': f.color }}
                                >
                                    {/* Glow layer */}
                                    <motion.div
                                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                        style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.color}18 0%, transparent 70%)` }}
                                    />
                                    <div className="relative z-10">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                                            style={{ background: `${f.color}15`, color: f.color }}>
                                            {f.icon}
                                        </div>
                                        <h3 className="text-[14px] font-bold text-white mb-1.5">{f.title}</h3>
                                        <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
                                    </div>
                                </motion.div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-20 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal className="text-center mb-12">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">How it works</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">Three steps to your shortlist.</h2>
                    </ScrollReveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        {steps.map((s, i) => (
                            <ScrollReveal key={i} delay={i * 0.12}>
                                <div className="text-center md:text-left">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] mb-4 relative z-10">
                                        <span className="text-[12px] font-black text-white/40">{s.n}</span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-white mb-2">{s.title}</h3>
                                    <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA — animated gradient border ── */}
            <section className="py-16 px-6">
                <ScrollReveal>
                    <div className="max-w-2xl mx-auto text-center">
                        {/* Rotating gradient border wrapper */}
                        <div className="relative p-[1.5px] rounded-2xl"
                            style={{ background: 'conic-gradient(from var(--angle, 0deg), #E11D48, #7C3AED, #2563EB, #059669, #E11D48)', animation: 'spin-border 4s linear infinite' }}>
                            <div className="relative rounded-2xl bg-[#0d0808] p-10 overflow-hidden">
                                <div className="absolute inset-0 bg-rose-500/5 rounded-2xl" />
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none" />
                                <div className="relative z-10">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white mb-3">Ready to hire smarter?</h2>
                                    <p className="text-white/40 text-[14px] mb-7">Join companies already using Shortlisto for faster, fairer recruitment.</p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button onClick={() => navigate('/admin/register')}
                                            className="group flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-[14px] rounded-xl hover:bg-white/90 transition-all active:scale-95">
                                            Create Free Account <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                        <button onClick={() => navigate('/admin/login')}
                                            className="px-6 py-3 border border-white/10 text-white/50 font-medium text-[14px] rounded-xl hover:border-white/20 hover:text-white transition-all">
                                            Already have an account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-white/5 py-8 px-6 bg-[#0d0d0d]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '120px' }} className="h-auto object-contain opacity-70" />
                    <p className="text-[12px] text-white/25">© {new Date().getFullYear()} Shortlisto. Built for modern recruitment teams.</p>
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/admin/login')} className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Sign In</button>
                        <button onClick={() => navigate('/admin/register')} className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Get Started</button>
                    </div>
                </div>
            </footer>

            {/* ── Global keyframes ── */}
            <style>{`
                @keyframes shimmer {
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
                @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes spin-border {
                    to { --angle: 360deg; }
                }
            `}</style>
        </div>
    );
}
