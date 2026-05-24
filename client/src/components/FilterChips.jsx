import React from 'react';
import { X } from 'lucide-react';

const FilterChips = ({ filters, setFilter, onClear, labels = {} }) => {
    const activeFilters = Object.entries(filters).filter(([key, val]) =>
        !['page', 'limit', 'search'].includes(key) && val !== '' && val !== null
    );

    if (activeFilters.length === 0) return null;

    const formatLabel = (key, val) => {
        let label = labels[key] || key;
        if (key.startsWith('min')) {
            const field = key.slice(3).charAt(0).toLowerCase() + key.slice(4);
            label = `Min ${labels[field] || field}`;
        } else if (key.startsWith('max')) {
            const field = key.slice(3).charAt(0).toLowerCase() + key.slice(4);
            label = `Max ${labels[field] || field}`;
        }
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-xl animate-in zoom-in-95 duration-200">
                <span className="text-[8px] font-black text-white/25 uppercase tracking-widest">{label}:</span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-tight">{val}</span>
                <button onClick={() => setFilter(key, '')} className="ml-1 text-white/25 hover:text-[#F43F5E] transition-colors">
                    <X size={11} strokeWidth={3} />
                </button>
            </span>
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active:</span>
            {activeFilters.map(([key, val]) => (
                <React.Fragment key={key}>{formatLabel(key, val)}</React.Fragment>
            ))}
            <button onClick={onClear} className="text-[9px] font-black text-[#F43F5E] hover:text-white px-2 py-1 uppercase tracking-widest transition-colors">
                Clear All
            </button>
        </div>
    );
};

export default FilterChips;
