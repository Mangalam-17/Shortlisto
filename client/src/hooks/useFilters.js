import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import useDebounce from './useDebounce';

/**
 * Hook to manage complex filters and sync with URL search params.
 */
const useFilters = (initialFilters = {}) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse active filters from URL
    const filters = useMemo(() => {
        const active = { ...initialFilters };
        searchParams.forEach((value, key) => {
            if (['page', 'limit'].includes(key)) return;
            active[key] = value;
        });
        return active;
    }, [searchParams, initialFilters]);

    const setFilter = useCallback((key, value) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                next.delete(key);
            } else if (Array.isArray(value)) {
                next.set(key, value.join(','));
            } else {
                next.set(key, value);
            }
            next.delete('page'); // Reset pagination on filter change
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const setFilters = useCallback((newFilters) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.keys(newFilters).forEach(key => {
                const val = newFilters[key];
                if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                    next.delete(key);
                } else if (Array.isArray(val)) {
                    next.set(key, val.join(','));
                } else {
                    next.set(key, val);
                }
            });
            next.delete('page');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const clearFilters = useCallback(() => {
        setSearchParams(prev => {
            const next = new URLSearchParams();
            // Preserve pagination if desired, but usually we reset it
            if (prev.has('limit')) next.set('limit', prev.get('limit'));
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Derived search state with debounce
    const search = filters.search || '';
    const debouncedSearch = useDebounce(search, 500);

    return {
        filters,
        setFilter,
        setFilters,
        clearFilters,
        search,
        debouncedSearch
    };
};

export default useFilters;
