import React, { useState } from 'react';
import { BookOpen, Sparkles, Bookmark, Menu, X, ArrowRight, Languages } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, wordCount = 0 }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'reader', label: 'AI Reader', badge: 'Interactive' },
    { id: 'words', label: 'My Words', count: wordCount }
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-700 transition-colors">
                  Paarth
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  पार्थ
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 -mt-0.5 hidden sm:block">
                Never miss the meaning
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center gap-2 ${
                    isActive
                      ? 'text-brand-700 bg-brand-50/80 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-700">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600 text-white min-w-4 text-center leading-none">
                      {item.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-md border border-slate-200/60">
              <Languages className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-medium">English ⇄ हिन्दी ⇄ मराठी</span>
            </div>

            <button
              onClick={() => handleNavClick('reader')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-medium shadow-sm shadow-brand-500/20 transition-all hover:shadow-md hover:shadow-brand-500/25 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Reader</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => handleNavClick('reader')}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-600 text-white"
            >
              Reader
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.id === 'home' && <BookOpen className="w-4 h-4" />}
                  {item.id === 'reader' && <Sparkles className="w-4 h-4" />}
                  {item.id === 'words' && <Bookmark className="w-4 h-4" />}
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-3">
            <span>Current Language Mode:</span>
            <span className="font-semibold text-brand-700">English ⇄ Hindi ⇄ Marathi</span>
          </div>
        </div>
      )}
    </header>
  );
}
