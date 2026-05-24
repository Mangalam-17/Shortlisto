import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;
    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            navigate('/admin');
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length > 0) setError(data.errors[0].msg);
            else setError(data?.msg || 'Incorrect email or password');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/15 transition-all";

    return (
        <div className="min-h-screen bg-[#080808] text-white flex overflow-hidden">

            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-rose-500/12 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-rose-700/8 rounded-full blur-[80px] pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10">
                    <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '140px' }}
                        className="h-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>

                {/* Center content */}
                <div className="relative z-10">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-5">Admin Portal</p>
                    <h1 className="text-4xl xl:text-5xl font-black tracking-tighter leading-[1.0] mb-5">
                        <span className="text-white">Hire Smarter.</span><br />
                        <span className="text-rose-500">Assess Faster.</span>
                    </h1>
                    <p className="text-white/35 text-[14px] leading-relaxed max-w-sm">
                        Manage your recruitment drives, assessments, and candidate pipeline — all from one dashboard.
                    </p>
                </div>

                {/* Bottom stats */}
                <div className="relative z-10 flex items-center gap-8">
                    {[['500+', 'Companies'], ['50k+', 'Assessed'], ['98%', 'Accuracy']].map(([val, label]) => (
                        <div key={label}>
                            <p className="text-lg font-black text-white">{val}</p>
                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">{label}</p>
                        </div>
                    ))}
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
                        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
                        <p className="text-white/40 text-[13px] mt-1">Sign in to your admin dashboard.</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10">
                            <p className="text-[12px] font-medium text-red-400">{error}</p>
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div>
                            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                <input type="email" name="email" value={email} onChange={onChange} required
                                    placeholder="admin@shortlisto.app" className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                                <input type="password" name="password" value={password} onChange={onChange} required
                                    placeholder="••••••••" className={inputCls} />
                            </div>
                        </div>
                        <div className="pt-1">
                            <button type="submit" disabled={loading}
                                className="group w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-semibold text-[13px] rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50">
                                {loading ? 'Signing in...' : <><span>Continue to Dashboard</span><ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>}
                            </button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-[12px] text-white/30">
                        New to Shortlisto?{' '}
                        <button onClick={() => navigate('/admin/register')} className="text-rose-500 hover:text-rose-400 font-semibold transition-colors">Create an account</button>
                    </p>
                    <p className="mt-3 text-center">
                        <button onClick={() => navigate('/')} className="text-[11px] text-white/20 hover:text-white/40 transition-colors">← Back to home</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
