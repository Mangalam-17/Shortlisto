import React from 'react';
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Users, Upload, Award,
    LogOut, Clock, BarChart3, Search, X, Menu,
    Settings2, ChevronDown, Sun, Moon, Bell
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={14} />, exact: true },
    { path: '/admin/create-drive', label: 'Drives', icon: <FileText size={14} /> },
    { path: '/admin/schedule-assessment', label: 'Assessments', icon: <Clock size={14} /> },
    { path: '/admin/candidates', label: 'Candidates', icon: <Users size={14} /> },
    { path: '/admin/questions', label: 'Questions', icon: <Upload size={14} /> },
    { path: '/admin/results', label: 'Results', icon: <Award size={14} /> },
    { path: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
    { path: '/admin/settings', label: 'Settings', icon: <Settings2 size={14} /> },
];

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();

    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/admin/login" replace />;

    useQuery({
        queryKey: ['drives-list'],
        queryFn: async () => {
            const res = await api.get('/drives');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: false
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin/login');
    };

    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [lastKeyPress, setLastKeyPress] = React.useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                if (lastKeyPress === 'g') {
                    const map = { d: '/admin', c: '/admin/create-drive', a: '/admin/schedule-assessment', u: '/admin/candidates', q: '/admin/questions', r: '/admin/results', n: '/admin/analytics', s: '/admin/settings' };
                    if (map[e.key]) navigate(map[e.key]);
                    setLastKeyPress(null);
                } else if (e.key === 'g') {
                    setLastKeyPress('g');
                    setTimeout(() => setLastKeyPress(null), 1000);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lastKeyPress, navigate]);

    React.useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [location.pathname]);

    const filteredItems = navItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Theme-aware classes
    const bg = isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8f9fa]';
    const navBg = isDark ? 'bg-[#141414] border-white/8' : 'bg-white border-gray-200';
    const navText = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-white/40' : 'text-gray-500';
    const activeNavBg = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900';
    const inactiveNav = isDark ? 'text-white/50 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900';
    const pillBg = isDark ? 'bg-white/[0.06] border-white/8' : 'bg-gray-50 border-gray-200';
    const searchBg = isDark ? 'bg-white/5 border-white/8 text-white/40 hover:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100';
    const userBtnBg = isDark ? 'bg-white/5 border-white/8 hover:bg-white/8' : 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    const dropdownBg = isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200';
    const mobileBg = isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-gray-100';
    const cmdBg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
    const cmdInput = isDark ? 'text-white placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-400';
    const cmdItem = isDark ? 'hover:bg-white/5 text-white/60 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900';
    const cmdIconBg = isDark ? 'bg-white/5' : 'bg-gray-100';
    const cmdFooter = isDark ? 'border-white/5 text-white/20' : 'border-gray-100 text-gray-400';
    const cmdKbd = isDark ? 'bg-white/8 border-white/10 text-white/30' : 'bg-gray-100 border-gray-200 text-gray-500';
    const themeBtn = isDark ? 'bg-white/5 border-white/8 text-white/50 hover:bg-white/10 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900';

    return (
        <div className={`flex flex-col min-h-screen ${bg} transition-colors duration-200`}>

            {/* ── TOP NAVBAR ── */}
            <header className={`sticky top-0 z-50 border-b ${navBg} backdrop-blur-xl transition-colors duration-200`}>
                <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                <div className="flex items-center h-14 gap-3 relative">

                        {/* Logo */}
                        <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/admin')}>
                            <img src="/shortlisto-img.png" alt="Shortlisto" style={{ width: '120px' }} className="h-auto object-contain" />
                        </div>

                        {/* Center nav — absolutely centered so it never shifts */}
                        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
                            <div className={`flex items-center ${pillBg} border rounded-xl px-1.5 py-1 gap-0.5`}>
                                {navItems.map((item) => {
                                    const isActive = item.exact
                                        ? location.pathname === item.path
                                        : location.pathname.startsWith(item.path);
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.exact}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 whitespace-nowrap ${isActive ? activeNavBg : inactiveNav}`}
                                        >
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </nav>

                        {/* Right actions */}
                        <div className="flex-shrink-0 flex items-center gap-2 ml-auto">

                            {/* Search */}
                            <button
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[12px] transition-all ${searchBg}`}
                            >
                                <Search size={13} />
                                <span className="hidden md:block">Search</span>
                                <span className="hidden md:flex items-center gap-1 ml-1">
                                    <kbd className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${cmdKbd}`}>⌘K</kbd>
                                </span>
                            </button>

                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className={`p-2 border rounded-lg transition-all ${themeBtn}`}
                                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                            </button>

                            {/* User menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg transition-all ${userBtnBg}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-rose-500 flex items-center justify-center text-[10px] font-black text-white">A</div>
                                    <ChevronDown size={12} className={`${mutedText} transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isUserMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                                        <div className={`absolute right-0 mt-1.5 w-44 border rounded-xl shadow-lg z-50 overflow-hidden ${dropdownBg}`}>
                                            <button
                                                onClick={handleLogout}
                                                className={`flex items-center gap-3 w-full px-4 py-2.5 text-[13px] transition-all ${isDark ? 'text-white/50 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                                            >
                                                <LogOut size={14} />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className={`lg:hidden p-2 border rounded-lg transition-all ${userBtnBg} ${navText}`}
                            >
                                {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className={`lg:hidden border-t px-4 py-3 ${mobileBg}`}>
                        <div className="grid grid-cols-2 gap-1">
                            {navItems.map((item) => {
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.exact}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all ${isActive ? activeNavBg : inactiveNav}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {/* ── MAIN ── */}
            <main className="flex-1 px-4 pt-6 pb-8 md:px-8 md:pt-8">
                <div className="max-w-[1400px] mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* ── COMMAND PALETTE ── */}
            {isCommandPaletteOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setIsCommandPaletteOpen(false)}>
                    <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 ${cmdBg}`}
                        onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center px-4 py-3.5 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                            <Search className={`mr-3 flex-shrink-0 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search pages..."
                                className={`w-full bg-transparent border-none outline-none text-[14px] font-medium ${cmdInput}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsCommandPaletteOpen(false);
                                    if (e.key === 'Enter' && filteredItems.length > 0) {
                                        navigate(filteredItems[0].path);
                                        setIsCommandPaletteOpen(false);
                                        setSearchQuery('');
                                    }
                                }}
                            />
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto p-1.5">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => { navigate(item.path); setIsCommandPaletteOpen(false); setSearchQuery(''); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${cmdItem}`}
                                    >
                                        <span className={`p-1.5 rounded-md ${cmdIconBg}`}>{item.icon}</span>
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    </button>
                                ))
                            ) : (
                                <div className={`p-8 text-center text-[13px] ${mutedText}`}>No results for "{searchQuery}"</div>
                            )}
                        </div>
                        <div className={`flex px-4 py-2.5 border-t items-center justify-between text-[10px] ${cmdFooter}`}>
                            <span className="flex items-center gap-1.5">
                                <kbd className={`px-1.5 py-0.5 border rounded text-[9px] ${cmdKbd}`}>Enter</kbd> Select
                            </span>
                            <span>Esc to close</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
