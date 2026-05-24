import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

const Instructions = () => {
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let retries = 0;
        const maxRetries = 3;

        const fetchMeta = async () => {
            try {
                const res = await api.get('/assessments/meta');

                // If status is UPCOMING, but we just came from WaitingRoom, 
                // wait a bit and retry once before redirecting back
                if (res.data.status === 'UPCOMING' && retries < maxRetries) {
                    retries++;
                    setTimeout(fetchMeta, 2000);
                    return;
                }

                if (res.data.status === 'EXPIRED') {
                    navigate('/assessment/ended');
                    return;
                }

                setMeta(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Fetch meta error:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate('/assessment/login');
                } else if (err.response?.status === 400 && err.response?.data?.submitted) {
                    navigate('/assessment/thank-you');
                } else if (retries < maxRetries) {
                    retries++;
                    setTimeout(fetchMeta, 2000);
                } else {
                    alert('Could not verify assessment status. Redirecting to login.');
                    navigate('/assessment/login');
                }
            }
        };
        fetchMeta();
    }, [navigate]);

    useEffect(() => {
        if (!meta) return;

        // Only redirect to waiting room if status is UPCOMING and we're significantly before start time
        if (meta.status === 'UPCOMING') {
            const startTime = new Date(meta.drive.startTime).getTime();
            const now = new Date().getTime();
            // If more than 10 seconds remaining, go back to waiting room
            if (startTime - now > 10000) {
                navigate('/assessment/waiting-room');
            } else {
                // If very close, just force status to ONGOING locally to show instructions
                setMeta(prev => ({ ...prev, status: 'ONGOING' }));
            }
        }
    }, [meta, navigate]);

    const formatTime = (ms) => {
        if (ms <= 0) return "00:00:00";
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        // Request Full Screen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.log(err));
        }
        navigate('/assessment/live');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6 animate-pulse">
                <img src="/logo.png" alt="Shortlisto" className="h-12 w-auto grayscale opacity-50" />
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E11D48]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-200/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="z-10 bg-white max-w-2xl w-full rounded-3xl shadow-2xl shadow-rose-100/60 border border-slate-100 overflow-hidden transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white px-8 py-10 md:px-12 md:py-12 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-50 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#E11D48] to-[#6B63FF]"></div>
                    
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 mb-2 uppercase">{meta.drive.name}</h1>
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Candidate: {meta.candidateName}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center sm:items-end">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">SHORTLISTO</span>
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mt-0.5">Assessment</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    <div className="mb-10 p-8 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={80} className="text-[#E11D48]" />
                        </div>
                        
                        <h3 className="flex items-center text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-6">
                            <AlertTriangle className="mr-3 text-[#E11D48]" size={18} /> Evaluation Protocol
                        </h3>
                        
                        <ul className="space-y-4 relative z-10">
                            {[
                                "Full screen mode is mandatory - minimizing will count as a violation.",
                                "ANY EXIT from fullscreen will result in IMMEDIATE TERMINATION.",
                                "Tab switching is strictly prohibited - violations are tracked instantly.",
                                "Maximum 3 tab-switch violations allowed before auto-submission.",
                                "Ensure a stable internet connection before initializing."
                            ].map((text, i) => (
                                <li key={i} className="flex items-start text-[11px] font-bold text-slate-500 leading-relaxed group/item">
                                    <span className="mr-4 text-[#E11D48] transition-transform group-hover/item:scale-125 inline-block select-none">•</span>
                                    {text.includes("IMMEDIATE TERMINATION") ? (
                                        <span>{text.split("IMMEDIATE TERMINATION")[0]}<strong className="text-red-500 font-black">IMMEDIATE TERMINATION</strong>{text.split("IMMEDIATE TERMINATION")[1]}</span>
                                    ) : text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-center mb-10 px-4 group cursor-pointer">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                id="acknowledge"
                                className="peer h-5 w-5 opacity-0 absolute cursor-pointer"
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                            />
                            <div className={`h-5 w-5 border-2 rounded-md flex items-center justify-center transition-all duration-300 ${acknowledged ? 'bg-[#E11D48] border-[#E11D48]' : 'bg-white border-slate-200 group-hover:border-rose-300'}`}>
                                {acknowledged && <CheckCircle size={14} className="text-white" />}
                            </div>
                        </div>
                        <label htmlFor="acknowledge" className={`ml-4 text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer select-none transition-colors ${acknowledged ? 'text-slate-800' : 'text-slate-400'}`}>
                            I accept the evaluation protocol
                        </label>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!acknowledged}
                        className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-300 ${!acknowledged
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                            : 'bg-[#E11D48] text-white hover:bg-[#3D35B8] shadow-xl shadow-rose-100 hover:shadow-rose-200 transform hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                    >
                        Initialize Assessment
                    </button>
                    
                    <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] mt-8">
                        Secure Environment Active
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Instructions;
