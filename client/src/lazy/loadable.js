import { lazy } from 'react';

// Admin pages - lazy loaded
export const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));
export const AdminRegister = lazy(() => import('../pages/admin/AdminRegister'));
export const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
export const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
export const CreateDrive = lazy(() => import('../pages/admin/CreateDrive'));
export const CandidateList = lazy(() => import('../pages/admin/CandidateList'));
export const QuestionUpload = lazy(() => import('../pages/admin/QuestionUpload'));
export const AssessmentPanel = lazy(() => import('../pages/admin/AssessmentPanel'));
export const Results = lazy(() => import('../pages/admin/Results'));
export const Analytics = lazy(() => import('../pages/admin/Analytics'));
export const Settings = lazy(() => import('../pages/admin/Settings'));

// Candidate pages - lazy loaded
export const CandidateRegister = lazy(() => import('../pages/public/CandidateRegister'));
export const LandingPage = lazy(() => import('../pages/public/LandingPage'));
export const NotFound = lazy(() => import('../pages/public/NotFound'));
export const AssessmentLogin = lazy(() => import('../pages/candidate/AssessmentLogin'));
export const WaitingRoom = lazy(() => import('../pages/candidate/WaitingRoom'));
export const Instructions = lazy(() => import('../pages/candidate/Instructions'));
export const Assessment = lazy(() => import('../pages/candidate/Assessment'));
export const ThankYou = lazy(() => import('../pages/candidate/ThankYou'));
export const AssessmentEnded = lazy(() => import('../pages/candidate/AssessmentEnded'));

// Utility components - lazy loaded
export const LoadingSpinner = lazy(() => import('../components/LoadingSpinner'));
export const ErrorBoundary = lazy(() => import('../components/ErrorBoundary'));
