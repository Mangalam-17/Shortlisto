import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart3, Users, FileText, Clock, ChevronRight } from 'lucide-react';

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

export default function LandingPage() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [statsRef, statsInView] = useInView(0.4);

    const c1 = useCounter(stats[0].value, 1400, statsInView);
    const c2 = useCounter(stats[1].value, 1800, statsInView);
    const c3 = useCounter(stats[2].value, 1200, statsInView);
    const c4 = useCounter(stats[3].value, 1000, statsInView);
    const counters = [c1, c2, c3, c4];

    return (
        <div className="bg-[#080808] text-white min-h-screen font-sans overflow-x-hidden">

            {/* ── NAVBAR ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/90 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '130px' }} className="h-auto object-contain" />
                    <div className="hidden md:flex items-center space-x-7">
                        {['Features', 'How it works', 'Why Shortlisto'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">{l}</a>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={() => navigate('/admin/login')} className="text-[13px] font-medium text-white/60 hover:text-white transition-colors px-3 py-1.5">Sign In</button>
                        <button onClick={() => navigate('/admin/register')} className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-white/90 transition-all active:scale-95">
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
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="block text-[13px] text-white/60 hover:text-white" onClick={() => setMenuOpen(false)}>{l}</a>
                        ))}
                        <div className="pt-2 flex flex-col gap-2">
                            <button onClick={() => navigate('/admin/login')} className="w-full py-2.5 border border-white/10 rounded-lg text-[13px] font-medium text-white/60">Sign In</button>
                            <button onClick={() => navigate('/admin/register')} className="w-full py-2.5 bg-white rounded-lg text-[13px] font-semibold text-black">Get Started</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO ── */}
            <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-500/8 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto">
                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.0] mb-5">
                        <span className="text-white">Hire Smarter.</span><br />
                        <span className="text-rose-500">Assess Faster.</span>
                    </h1>

                    <p className="text-white/50 text-[15px] md:text-[16px] max-w-xl mx-auto leading-relaxed mb-8">
                        Shortlisto automates your recruitment pipeline — from drive creation to ranked shortlists — so your team focuses on people, not process.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                        <button onClick={() => navigate('/admin/register')}
                            className="group flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-[14px] rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/10">
                            Start for Free <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={() => navigate('/admin/login')}
                            className="flex items-center gap-2 px-6 py-3 border border-white/10 text-white/60 font-medium text-[14px] rounded-xl hover:border-white/20 hover:text-white transition-all">
                            Sign In <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-5 flex-wrap">
                        {['No credit card required', 'Setup in 5 minutes', 'Cancel anytime'].map(t => (
                            <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/30">
                                <CheckCircle2 size={12} className="text-emerald-500" />{t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Dashboard mockup */}
                <div className="relative z-10 mt-14 max-w-4xl mx-auto">
                    <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/10" />)}
                            <div className="ml-3 h-4 w-40 rounded bg-white/5" />
                        </div>
                        <div className="p-5 grid grid-cols-4 gap-3">
                            {[['Recruitment Drives','12','+3 this week'],['Active Candidates','248','+24 this week'],['Shortlisted','67','+12 this week'],['Assessments','8','+2 this week']].map(([label, val, change]) => (
                                <div key={label} className="rounded-xl bg-white/[0.04] border border-white/5 p-3.5">
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">{label}</p>
                                    <p className="text-xl font-black text-white">{val}</p>
                                    <p className="text-[10px] text-emerald-400 mt-1">↑ {change}</p>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 pb-5 grid grid-cols-3 gap-3">
                            {[['Frontend Engineer Drive','48 candidates','Live'],['Backend Assessment','32 candidates','Scheduled'],['Data Analyst Batch','61 candidates','Ended']].map(([name, count, status]) => (
                                <div key={name} className="rounded-xl bg-white/[0.04] border border-white/5 p-3.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold text-white/70">{name}</p>
                                        <p className="text-[10px] text-white/30 mt-0.5">{count}</p>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${status === 'Live' ? 'bg-emerald-500/15 text-emerald-400' : status === 'Scheduled' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-white/30'}`}>{status}</span>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section ref={statsRef} className="py-12 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {stats.map((s, i) => (
                        <div key={i}>
                            <p className="text-3xl font-black text-white tabular-nums">{counters[i].toLocaleString()}{s.suffix}</p>
                            <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">Features</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">Everything you need.<br /><span className="text-white/30">Nothing you don't.</span></h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((f, i) => (
                            <div key={i} className="group p-5 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12 transition-all duration-200">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                                    style={{ background: `${f.color}15`, color: f.color }}>
                                    {f.icon}
                                </div>
                                <h3 className="text-[14px] font-bold text-white mb-1.5">{f.title}</h3>
                                <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-20 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">How it works</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">Three steps to your shortlist.</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        {steps.map((s, i) => (
                            <div key={i} className="text-center md:text-left">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] mb-4 relative z-10">
                                    <span className="text-[12px] font-black text-white/40">{s.n}</span>
                                </div>
                                <h3 className="text-[15px] font-bold text-white mb-2">{s.title}</h3>
                                <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-16 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-10 overflow-hidden">
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
        </div>
    );
}
