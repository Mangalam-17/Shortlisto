import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

const ThankYou = () => {
    useEffect(() => {
        // Clear tokens to ensure no re-access
        localStorage.removeItem('token');
        localStorage.removeItem('candidateToken');

        // Prevent back navigation
        window.history.pushState(null, null, window.location.href);
        const handlePopState = (event) => {
            window.history.pushState(null, null, window.location.href);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E11D48]/5 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[120px] opacity-40 animate-pulse delay-700"></div>
            
            <div className="z-10 flex flex-col items-center w-full max-w-2xl transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                {/* Branding Section */}
                <div className="flex items-center justify-center space-x-3 mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase tabular-nums leading-none">SHORTLISTO</h2>
                </div>

                <div className="bg-white p-10 md:p-16 rounded-[48px] shadow-[0_32px_64px_-16px_rgba(72,67,210,0.12)] border border-slate-100 text-center w-full relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#E11D48] to-[#6B63FF]"></div>
                    
                    <div className="w-24 h-24 md:w-28 md:h-28 bg-[#E11D48]/5 rounded-[32px] flex items-center justify-center mx-auto mb-10 relative">
                        <CheckCircle className="text-[#E11D48] w-12 h-12 md:w-14 md:h-14 animate-in zoom-in duration-500 delay-300" />
                        <div className="absolute inset-0 rounded-[32px] border-2 border-[#E11D48]/10 animate-ping opacity-20"></div>
                    </div>
                    
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Assessment Complete</h1>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-12 flex items-center justify-center gap-4">
                        <span className="w-10 h-px bg-slate-100"></span>
                        Submission Successful
                        <span className="w-10 h-px bg-slate-100"></span>
                    </p>

                    <div className="bg-slate-50/50 p-8 md:p-10 rounded-[32px] border border-slate-100 mb-12 text-left relative">
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-12 bg-[#E11D48] rounded-r-full"></div>
                        <p className="text-sm md:text-base font-bold text-slate-600 leading-relaxed pl-4">
                            Thank you for your participation! Our hiring team will review your performance and contact you via email if your profile is shortlisted for further rounds.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">
                            Secure Environment Logged Out
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">You may now close this window safely.</p>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Powered by Shortlisto</p>
                </div>
            </div>
        </div>
    );
};

export default ThankYou;
