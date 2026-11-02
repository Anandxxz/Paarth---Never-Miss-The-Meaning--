import React from 'react';
import { BookOpen, Heart, Sparkles, Languages, Github } from 'lucide-react';

export default function Footer({ setActivePage }) {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Paarth</span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 border border-slate-700">
                पार्थ • Companion
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Paarth is an AI-powered bilingual reading companion built for learners, translators, and literature enthusiasts. Bridge linguistic barriers with synchronized dual-text alignment, instant contextual definitions, and smart vocabulary mastery.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Designed with modern Blue & White SaaS aesthetic</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => { setActivePage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-white transition-colors"
                >
                  Landing Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('reader'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>Dual AI Reader</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300">Live</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('words'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-white transition-colors"
                >
                  My Words & Flashcards
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActivePage('home');
                    setTimeout(() => {
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="hover:text-white transition-colors"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Supported Languages */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Languages Supported
            </h4>
            <div className="flex flex-wrap gap-1.5 text-xs text-slate-400">
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-semibold text-white">English</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-semibold text-brand-300">हिन्दी (Hindi)</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-semibold text-amber-300">मराठी (Marathi)</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60">Español</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60">Français</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60">संस्कृतम् (Sanskrit)</span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60">தமிழ் (Tamil)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Active bidirectional AI translation across English, Hindi, and Marathi.
            </p>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} Paarth. Built for bilingual readers worldwide.</p>
          <div className="flex items-center gap-1">
            <span>Empowering reading through AI</span>
            <span className="text-slate-400">✦</span>
            <span>Clean SaaS Frontend</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
