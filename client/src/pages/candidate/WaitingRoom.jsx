import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Clock, Loader } from 'lucide-react';

const WaitingRoom = () => {
    const [meta, setMeta] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await api.get('/assessments/meta');
                setMeta(res.data);

                if (res.data.status === 'ONGOING') {
                    navigate('/assessment/instructions');
                } else if (res.data.status === 'EXPIRED') {
                    navigate('/assessment/ended');
                } else {
                    // Update timer
                    const startInfo = new Date(res.data.drive.startTime).getTime();
                    const now = new Date().getTime();
                    setTimeLeft(Math.max(0, Math.floor((startInfo - now) / 1000)));
                }
            } catch (err) {
                console.error(err);
                if (err.response?.status === 400 && err.response?.data?.submitted) {
                    navigate('/assessment/thank-you');
                } else {
                    navigate('/assessment/login');
                }
            }
        };

        fetchMeta();
        const interval = setInterval(fetchMeta, 10000); // Poll every 10s to sync status
        return () => clearInterval(interval);
    }, [navigate]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            // Wait 1.5 seconds before navigating to ensure server status is updated 
            // and avoid immediate bounce-back from Instructions page
            const redirectTimer = setTimeout(() => {
                navigate('/assessment/instructions');
            }, 1500);
            return () => clearTimeout(redirectTimer);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, navigate]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return (
            <div className="flex items-center justify-center gap-4 md:gap-8">
                <div className="flex flex-col items-center">
                    <span className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter drop-shadow-sm leading-none">{h}</span>
                    <span className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2 md:mt-4">Hours</span>
                </div>
                <div className="text-3xl md:text-5xl font-black text-slate-200 mb-6 md:mb-10">:</div>
                <div className="flex flex-col items-center">
                    <span className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter drop-shadow-sm leading-none">{m}</span>
                    <span className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2 md:mt-4">Minutes</span>
                </div>
                <div className="text-3xl md:text-5xl font-black text-slate-200 mb-6 md:mb-10">:</div>
                <div className="flex flex-col items-center">
                    <span className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter drop-shadow-sm leading-none">{s}</span>
                    <span className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2 md:mt-4">Seconds</span>
                </div>
            </div>
        );
    };

    if (!meta || timeLeft === null) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin text-[#E11D48]"><Loader size={40} /></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 relative overflow-hidden font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E11D48]/5 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[120px] opacity-40 animate-pulse delay-700"></div>
            
            <div className="z-10 text-center max-w-2xl w-full px-4 transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                {/* Branding Section - Horizontal Alignment */}
                <div className="flex items-center justify-center space-x-3 mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase tabular-nums leading-none">SHORTLISTO</h2>
                </div>

                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">Wishing you all the best</h1>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-4">
                        <span className="w-10 h-px bg-slate-100"></span>
                        Initializing for <span className="text-[#E11D48]">{meta.drive.name}</span>
                        <span className="w-10 h-px bg-slate-100"></span>
                    </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-[40px] p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(72,67,210,0.12)] mb-12 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#E11D48] to-[#6B63FF]"></div>
                    <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.4em] mb-10 flex items-center justify-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-ping"></span>
                        Assessment starts in
                    </p>
                    <div className="tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="space-y-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                    <div className="flex items-center justify-center gap-3">
                        <Loader size={14} className="animate-spin text-[#E11D48]" />
                        <p>Status: Synchronizing with Server Repository</p>
                    </div>
                    <p className="opacity-50 text-[9px] font-bold">Automatic redirection enabled</p>
                </div>
            </div>
        </div>
    );
};

export default WaitingRoom;
