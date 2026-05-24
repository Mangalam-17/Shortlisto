import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Lock, Mail, Shield } from 'lucide-react';

const AssessmentLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Capture testId from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const testId = urlParams.get('testId');

        try {
            const loginPayload = { ...formData };
            if (testId) loginPayload.testId = testId;

            const res = await api.post('/assessments/login', loginPayload);
            localStorage.setItem('candidateToken', res.data.token);
            localStorage.setItem('token', res.data.token);

            const metaRes = await api.get('/assessments/meta');
            if (metaRes.data.status === 'UPCOMING') {
                navigate('/assessment/waiting-room');
            } else if (metaRes.data.status === 'EXPIRED') {
                navigate('/assessment/ended');
            } else {
                navigate('/assessment/instructions');
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.submitted) {
                navigate('/assessment/thank-you');
            } else {
                setError(err.response?.data?.msg || 'Invalid Credentials');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans overflow-hidden">
            {/* Left Side: Branding / Visual (60% on Desktop) */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-[#E11D48] items-center justify-center overflow-hidden">
                {/* Visual Background Elements - Ambient Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#5D58E6] rounded-full blur-[120px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#BE123C] rounded-full blur-[120px] opacity-40 animate-pulse delay-700"></div>

                <div className="relative z-10 text-center px-10 md:px-20">
                    <div className="flex items-center justify-center space-x-3 mb-10">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase tabular-nums leading-none">SHORTLISTO</h1>
                    </div>
                    <p className="text-rose-100/40 text-[13px] md:text-[15px] font-bold uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">
                        All-in-one platform for modern recruitment
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form (40% on Desktop, 100% on Mobile) */}
            <div className="w-full lg:w-[40%] flex flex-col justify-center px-8 sm:px-12 lg:px-20 relative bg-white">
                <div className="max-w-md w-full mx-auto">
                    {/* Brand for Mobile */}
                    <div className="lg:hidden flex flex-col items-center mb-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-1.5 h-8 bg-[#E11D48] rounded-full"></div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase tabular-nums">SHORTLISTO</h1>
                        </div>
                    </div>

                    <div className="mb-6 md:mb-10">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 tracking-tighter">Login</h2>
                        <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest leading-relaxed">
                            Please enter your assessment credentials
                        </p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl animate-in slide-in-from-top-2">
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-300 group-focus-within:text-[#E11D48] transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={onChange}
                                    required
                                    className="block w-full pl-12 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:bg-white focus:border-[#E11D48] focus:ring-[6px] focus:ring-[#E11D48]/5 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="name@university.edu"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-[#E11D48] transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={onChange}
                                    required
                                    className="block w-full pl-12 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:bg-white focus:border-[#E11D48] focus:ring-[6px] focus:ring-[#E11D48]/5 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-5 px-6 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-[#E11D48]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center">
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        "Enter Assessment"
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Powered by Shortlisto</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentLogin;
