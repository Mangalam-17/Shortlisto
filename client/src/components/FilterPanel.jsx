import React, { useState } from 'react';
import { Filter, ChevronDown, RotateCcw } from 'lucide-react';

const FilterPanel = ({ filters, setFilter, onClear, filterConfigs = [] }) => {
    const [isOpen, setIsOpen] = useState(false);

    const inputCls = 'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-[12px] font-medium text-white placeholder:text-white/20 outline-none focus:border-[#E11D48]/60 focus:ring-2 focus:ring-[#E11D48]/20 transition-all';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-[11px] uppercase tracking-widest active:scale-95 ${
                    isOpen
                        ? 'bg-[#E11D48] text-white border-[#E11D48]'
                        : 'bg-white/5 text-white/50 border-white/8 hover:bg-white/8 hover:text-white/80'
                }`}
            >
                <Filter size={13} />
                <span>Filters</span>
                {Object.keys(filters).filter(k => filters[k]).length > 0 && (
                    <span className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isOpen ? 'bg-white text-[#E11D48]' : 'bg-[#E11D48] text-white'}`}>
                        {Object.keys(filters).filter(k => filters[k]).length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[11px] font-black text-white/60 uppercase tracking-widest">Filters</h3>
                            <button onClick={onClear} className="text-[9px] font-black text-[#F43F5E] bg-[#E11D48]/10 px-2.5 py-1 rounded-lg uppercase tracking-widest hover:bg-[#E11D48]/20 transition-colors flex items-center gap-1">
                                <RotateCcw size={9} /> Reset
                            </button>
                        </div>

                        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                            {filterConfigs.map((config) => (
                                <div key={config.id} className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">{config.label}</label>

                                    {config.type === 'select' && (
                                        <div className="relative">
                                            <select
                                                value={filters[config.id] || ''}
                                                onChange={(e) => setFilter(config.id, e.target.value)}
                                                className={`${inputCls} appearance-none cursor-pointer`}
                                            >
                                                <option value="">All {config.label}</option>
                                                {config.options.map(opt => (
                                                    <option key={opt.value} value={opt.value} className="bg-[#111] text-white">{opt.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={12} />
                                        </div>
                                    )}

                                    {config.type === 'range' && (
                                        <div className="flex items-center space-x-2">
                                            <input type="number" placeholder="Min"
                                                value={filters[`min${config.id.charAt(0).toUpperCase() + config.id.slice(1)}`] || ''}
                                                onChange={(e) => setFilter(`min${config.id.charAt(0).toUpperCase() + config.id.slice(1)}`, e.target.value)}
                                                className={inputCls} />
                                            <span className="text-white/20 text-[10px]">—</span>
                                            <input type="number" placeholder="Max"
                                                value={filters[`max${config.id.charAt(0).toUpperCase() + config.id.slice(1)}`] || ''}
                                                onChange={(e) => setFilter(`max${config.id.charAt(0).toUpperCase() + config.id.slice(1)}`, e.target.value)}
                                                className={inputCls} />
                                        </div>
                                    )}

                                    {config.type === 'text' && (
                                        <input type="text" placeholder={`Enter ${config.label}`}
                                            value={filters[config.id] || ''}
                                            onChange={(e) => setFilter(config.id, e.target.value)}
                                            className={inputCls} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/8 flex justify-end">
                            <button onClick={() => setIsOpen(false)}
                                className="bg-white text-black px-5 py-2 rounded-xl hover:bg-white/90 transition-all font-bold text-[11px] uppercase tracking-widest active:scale-95">
                                Apply
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FilterPanel;
