import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ReaderPage from './pages/ReaderPage';
import MyWordsPage from './pages/MyWordsPage';
import { INITIAL_VOCABULARY } from './data/mockData';
import { BookmarkCheck, Sparkles, X } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') || (params.get('importText') ? 'reader' : 'home');
  });
  const [toastMessage, setToastMessage] = useState(null);

  // Load words from localStorage or fall back to INITIAL_VOCABULARY
  const [savedWords, setSavedWords] = useState(() => {
    try {
      const cached = localStorage.getItem('paarth_saved_words');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return INITIAL_VOCABULARY;
  });

  // Save to localStorage whenever savedWords updates
  useEffect(() => {
    try {
      localStorage.setItem('paarth_saved_words', JSON.stringify(savedWords));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
  }, [savedWords]);

  // Toast notification helper
  const showToast = (title, subtitle) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Add word from Reader
  const handleSaveWord = (newWord) => {
    const exists = savedWords.some(
      (w) => w.word.toLowerCase() === newWord.word.toLowerCase()
    );

    if (exists) {
      showToast(`"${newWord.word}" is already saved`, 'Check My Words to practice.');
      return;
    }

    setSavedWords((prev) => [newWord, ...prev]);
    showToast(`Saved "${newWord.word}"`, 'Added to your vocabulary flashcard bank.');
  };

  // Update mastery status
  const handleUpdateWordStatus = (id, newStatus) => {
    setSavedWords((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus, reviewCount: (item.reviewCount || 0) + 1 } : item
      )
    );
  };

  // Delete word
  const handleDeleteWord = (id) => {
    setSavedWords((prev) => prev.filter((item) => item.id !== id));
    showToast('Word removed', 'Removed from your vocabulary bank.');
  };

  // Manually add custom word
  const handleAddCustomWord = (wordData) => {
    setSavedWords((prev) => [wordData, ...prev]);
    showToast(`Added "${wordData.word}"`, 'Successfully created custom entry.');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      
      {/* Global Navbar */}
      <Navbar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        wordCount={savedWords.length} 
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage 
            setActivePage={setActivePage} 
          />
        )}

        {activePage === 'reader' && (
          <ReaderPage 
            savedWords={savedWords} 
            onSaveWord={handleSaveWord} 
            setActivePage={setActivePage} 
          />
        )}

        {activePage === 'words' && (
          <MyWordsPage 
            words={savedWords} 
            onUpdateWordStatus={handleUpdateWordStatus} 
            onDeleteWord={handleDeleteWord} 
            onAddWord={handleAddCustomWord} 
            setActivePage={setActivePage} 
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer setActivePage={setActivePage} />

      {/* Modern Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-elevated border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-xl bg-brand-600/30 text-brand-400 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{toastMessage.title}</p>
            {toastMessage.subtitle && (
              <p className="text-xs text-slate-400">{toastMessage.subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-md text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
