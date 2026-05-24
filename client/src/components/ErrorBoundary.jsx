import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-inner group">
                            <AlertTriangle className="text-red-500 group-hover:scale-110 transition-transform duration-500" size={48} />
                        </div>
                        
                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">System Encountered an Issue</h1>
                            <p className="text-[11px] font-black text-[#E11D48] uppercase tracking-[0.4em] flex items-center justify-center">
                                <span className="w-8 h-[2px] bg-[#E11D48] mr-3"></span>
                                Application Error
                                <span className="w-8 h-[2px] bg-[#E11D48] ml-3"></span>
                            </p>
                        </div>

                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 text-left relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 opacity-60">Technical Details</p>
                            <p className="text-sm font-black text-slate-700 leading-relaxed">
                                {this.state.error?.message || 'An unexpected error occurred in the user interface.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center justify-center gap-3 bg-[#E11D48] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-95 group"
                            >
                                <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                                Refresh Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-3 bg-white text-slate-900 border-2 border-slate-100 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:border-[#E11D48] hover:text-[#E11D48] transition-all active:scale-95"
                            >
                                <Home size={16} />
                                Return Home
                            </button>
                        </div>

                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] pt-8">
                            SHORTLISTO • PROTECTED SESSION
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
