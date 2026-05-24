import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook to manage pagination state and sync with URL search params.
 */
const usePagination = (initialLimit = 20) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit')) || initialLimit);

    const setPage = useCallback((newPage) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (newPage === 1) {
                next.delete('page');
            } else {
                next.set('page', newPage);
            }
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const setLimit = useCallback((newLimit) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('limit', newLimit);
            next.delete('page'); // Reset to first page on limit change
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    return {
        page,
        limit,
        setPage,
        setLimit,
        skip: (page - 1) * limit
    };
};

export default usePagination;
