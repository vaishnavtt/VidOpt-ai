import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, Sparkles, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onUploadClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onUploadClick }) => {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 20);
    return () => clearTimeout(timer);
  }, []);

  const navLinks = [
    { name: 'Analyze Video', path: '/' },
    { name: 'Prediction History', path: '/history' },
    { name: 'Model Insights', path: '/insights' },
    { name: 'About Project', path: '/about' },
  ];

  const isCurrent = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/analyze')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pointer-events-none"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-0.75rem)',
        transition: 'opacity 700ms cubic-bezier(0.2, 0, 0, 1) 150ms, transform 700ms cubic-bezier(0.2, 0, 0, 1) 150ms',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 group text-decoration-none focus:outline-hidden"
        >
          <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.18)] backdrop-blur-md flex items-center justify-center shadow-lg group-hover:border-cyan-400/50 transition-colors">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-[#eef0f6] group-hover:text-white transition-colors">
              VidOpt AI
            </span>
            <span className="text-[10px] text-[#b9becf]/70 font-normal tracking-wider uppercase -mt-0.5">
              Intelligent Video Transcoding
            </span>
          </div>
        </Link>

        {/* Desktop Centered Glass Pill Navigation */}
        <nav className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-xl shadow-xl shadow-black/20">
          {navLinks.map((link) => {
            const active = isCurrent(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-[rgba(255,255,255,0.12)] text-[#eef0f6] shadow-inner font-semibold border border-[rgba(255,255,255,0.1)]'
                    : 'text-[#b9becf] hover:text-[#eef0f6] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right White Pill CTA & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            onClick={onUploadClick}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#2f2f33] hover:bg-[#eef0f6] font-medium text-xs tracking-tight shadow-lg shadow-white/10 hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Upload Video</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.16)] backdrop-blur-md flex items-center justify-center text-[#eef0f6] focus:outline-hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 p-4 rounded-3xl bg-[rgba(4,5,12,0.92)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-2xl pointer-events-auto flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const active = isCurrent(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-2xl text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[rgba(255,255,255,0.12)] text-white font-semibold'
                    : 'text-[#b9becf] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <Link
            to="/"
            onClick={() => {
              setMobileMenuOpen(false);
              onUploadClick?.();
            }}
            className="mt-2 py-3 rounded-2xl bg-white text-[#2f2f33] font-semibold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Upload Video</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </header>
  );
};
