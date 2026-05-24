import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import api from './utils/api';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages from loadable module
import {
    AdminLogin,
    AdminRegister,
    AdminLayout,
    Dashboard,
    CreateDrive,
    CandidateList,
    QuestionUpload,
    AssessmentPanel,
    Results,
    Analytics,
    Settings,
    CandidateRegister,
    LandingPage,
    NotFound,
    AssessmentLogin,
    WaitingRoom,
    Instructions,
    Assessment,
    ThankYou,
    AssessmentEnded
} from './lazy/loadable';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes
            refetchOnWindowFocus: false,
            retry: 1,
            onError: (error) => {
                // Global error handling for react-query
                console.error('Query Error:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('candidateToken');
                    window.location.href = '/admin/login';
                }
            }
        },
        mutations: {
            onError: (error) => {
                console.error('Mutation Error:', error);
            }
        }
    },
});

function PrefetchDrives() {
    const queryClient = useQueryClient();
    const token = localStorage.getItem('token');
    const location = useLocation();
    
    useEffect(() => {
        // Only prefetch on admin routes and when an admin token likely exists
        if (token && location.pathname.startsWith('/admin')) {
            queryClient.prefetchQuery({
                queryKey: ['drives-list'],
                queryFn: async () => {
                    const res = await api.get('/drives');
                    return Array.isArray(res.data) ? res.data : [];
                }
            }).catch(err => console.error('Prefetch failed:', err));
        }
    }, [queryClient, token, location.pathname]);
    
    return null;
}

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <PrefetchDrives />
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen bg-white">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-10 h-10 border-2 border-black/5 border-t-black rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] animate-pulse">Loading...</p>
                        </div>
                    </div>
                }>
                    <Routes>
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin/register" element={<AdminRegister />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="create-drive" element={<CreateDrive />} />
                            <Route path="schedule-assessment" element={<AssessmentPanel />} />
                            <Route path="candidates" element={<CandidateList />} />
                            <Route path="questions" element={<QuestionUpload />} />
                            <Route path="results" element={<Results />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                        {/* Candidate routes */}
                        <Route path="/register/:driveId" element={<CandidateRegister />} />
                        <Route path="/assessment/login" element={<AssessmentLogin />} />
                        <Route path="/assessment/waiting-room" element={<WaitingRoom />} />
                        <Route path="/assessment/instructions" element={<Instructions />} />
                        <Route path="/assessment/live" element={<Assessment />} />
                        <Route path="/assessment/thank-you" element={<ThankYou />} />
                        <Route path="/assessment/ended" element={<AssessmentEnded />} />
                        <Route path="/" element={<LandingPage />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
                <Toaster position="top-right" reverseOrder={false} />
            </QueryClientProvider>
        </ErrorBoundary>
    )
}

export default App
