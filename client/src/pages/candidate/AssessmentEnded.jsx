import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const AssessmentEnded = () => {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EE4B2B]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-200/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="z-10 bg-white p-10 md:p-14 rounded-[40px] shadow-2xl shadow-red-100/60 border border-slate-100 text-center max-w-lg w-full transform transition-all duration-700 animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white shadow-xl shadow-red-50 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-slate-50 relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <AlertCircle className="text-red-500 w-12 h-12 md:w-16 md:h-16 relative z-10" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-4">Assessment Ended</h1>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] mb-12 flex items-center justify-center gap-3">
                    <span className="w-8 h-px bg-slate-200"></span>
                    Access Period Expired
                    <span className="w-8 h-px bg-slate-200"></span>
                </p>

                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 mb-10 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <p className="text-xs md:text-sm font-bold text-slate-600 leading-relaxed">
                        The assessment window for this drive has closed. We are no longer accepting new attempts. If you believe this is an error, please contact the recruitment team.
                    </p>
                </div>

                <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
                    Assessment powered by Shortlisto
                </div>
            </div>
        </div>
    );
};

export default AssessmentEnded;
