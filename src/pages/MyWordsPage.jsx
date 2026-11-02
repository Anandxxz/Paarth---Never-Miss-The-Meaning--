import React, { useState } from 'react';
import { 
  Bookmark, 
  Search, 
  Filter, 
  Volume2, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Layers, 
  Grid, 
  Sparkles, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight, 
  Download, 
  BookOpen, 
  X,
  Share2,
  Trophy,
  Target,
  Award,
  Check,
  CheckCircle2,
  XCircle,
  Flame,
  Zap,
  Play,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { INITIAL_VOCABULARY, DICTIONARY_DATABASE } from '../data/mockData';
import { playSpeech as playAudibleSpeech } from '../utils/speechService';

export default function MyWordsPage({ words, onUpdateWordStatus, onDeleteWord, onAddWord, setActivePage }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Mastered' | 'Learning' | 'Needs Review'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'flashcard' | 'quiz'

  // Flashcard mode state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Add word modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newContext, setNewContext] = useState('');

  // Quiz Engine state
  const [quizStatus, setQuizStatus] = useState('playing'); // 'setup' | 'playing' | 'completed'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [isQuizAnswerSubmitted, setIsQuizAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizMaxStreak, setQuizMaxStreak] = useState(0);
  const [quizUserAnswers, setQuizUserAnswers] = useState([]);
  const [hasAppliedMastery, setHasAppliedMastery] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizModeType, setQuizModeType] = useState('mixed'); // 'mixed' | 'en_to_hi' | 'hi_to_en' | 'definition' | 'audio'

  // High-clarity audio pronunciation helper
  const playSpeech = (text, lang) => {
    if (!text) return;
    const isDevanagari = /[\u0900-\u097F]/.test(text);
    playAudibleSpeech(text, {
      lang: lang || (isDevanagari ? 'hi-IN' : 'en-US'),
      rate: isDevanagari ? 0.92 : 0.96,
      volume: 1.0,
      pitch: 1.0
    });
  };

  // Generate randomized educational questions from saved words + distractor vocabulary
  const generateQuizQuestions = (wordsPool, count = 5, mode = 'mixed') => {
    const effectivePool = (wordsPool && wordsPool.length > 0) ? wordsPool : INITIAL_VOCABULARY;

    // Distractor vocabulary pool to ensure 4 distinct options even with small lists
    const distractorPool = [
      ...effectivePool,
      ...INITIAL_VOCABULARY,
      ...Object.values(DICTIONARY_DATABASE).map(d => ({
        id: `dict-${d.word}`,
        word: d.word,
        translation: d.translation,
        definition: d.definition,
        partOfSpeech: d.partOfSpeech,
        phonetic: d.phonetic,
        example: d.example
      }))
    ];

    // Shuffle and pick target words
    const shuffledPool = [...effectivePool].sort(() => Math.random() - 0.5);
    const selectedBatch = shuffledPool.slice(0, Math.min(count, shuffledPool.length));

    return selectedBatch.map((targetWord, index) => {
      const isHindiWord = /[\u0900-\u097F]/.test(targetWord.word);

      let questionType = 'en_to_hi';
      if (mode === 'mixed') {
        const types = ['en_to_hi', 'hi_to_en', 'definition', 'audio'];
        questionType = types[Math.floor(Math.random() * types.length)];
      } else {
        questionType = mode;
      }

      let questionText = '';
      let subText = '';
      let correctAnswer = '';
      let distractorCandidates = [];

      if (questionType === 'en_to_hi') {
        if (!isHindiWord) {
          questionText = `What is the Hindi translation of "${targetWord.word}"?`;
          subText = targetWord.partOfSpeech ? `Part of speech: ${targetWord.partOfSpeech}` : 'Select the accurate Hindi meaning';
          correctAnswer = targetWord.translation;
          distractorCandidates = distractorPool
            .filter(w => w.word !== targetWord.word && w.translation && w.translation !== targetWord.translation)
            .map(w => w.translation);
        } else {
          questionText = `What is the English meaning of "${targetWord.word}"?`;
          subText = 'Select the accurate English translation';
          correctAnswer = targetWord.translation;
          distractorCandidates = distractorPool
            .filter(w => w.word !== targetWord.word && w.translation && w.translation !== targetWord.translation)
            .map(w => w.translation);
        }
      } else if (questionType === 'hi_to_en') {
        if (!isHindiWord) {
          questionText = `Which English word corresponds to "${targetWord.translation}"?`;
          subText = 'Identify the matching vocabulary word';
          correctAnswer = targetWord.word;
          distractorCandidates = distractorPool
            .filter(w => w.word !== targetWord.word)
            .map(w => w.word);
        } else {
          questionText = `Which Hindi word matches "${targetWord.translation}"?`;
          subText = 'Select the matching Hindi term';
          correctAnswer = targetWord.word;
          distractorCandidates = distractorPool
            .filter(w => w.word !== targetWord.word)
            .map(w => w.word);
        }
      } else if (questionType === 'definition') {
        questionText = `Which word matches this definition?`;
        subText = `"${targetWord.definition || 'Key vocabulary entry'}"`;
        correctAnswer = targetWord.word;
        distractorCandidates = distractorPool
          .filter(w => w.word !== targetWord.word)
          .map(w => w.word);
      } else {
        // audio
        questionText = `Listen to the pronunciation and select the correct word:`;
        subText = `Click speaker to replay pronunciation`;
        correctAnswer = targetWord.word;
        distractorCandidates = distractorPool
          .filter(w => w.word !== targetWord.word)
          .map(w => w.word);
      }

      // Filter unique distractors and pick 3
      const uniqueDistractors = [...new Set(distractorCandidates)].filter(d => d !== correctAnswer).sort(() => Math.random() - 0.5);
      const chosenDistractors = uniqueDistractors.slice(0, 3);

      // Fallbacks if pool is very small
      while (chosenDistractors.length < 3) {
        chosenDistractors.push(`Distractor ${chosenDistractors.length + 1}`);
      }

      const allOptions = [correctAnswer, ...chosenDistractors].sort(() => Math.random() - 0.5);
      const correctIndex = allOptions.indexOf(correctAnswer);

      return {
        id: `q-${index + 1}-${targetWord.id}`,
        wordId: targetWord.id,
        targetWord,
        type: questionType,
        questionText,
        subText,
        options: allOptions,
        correctIndex,
        correctAnswer,
        audioWord: targetWord.word,
        explanation: {
          word: targetWord.word,
          phonetic: targetWord.phonetic,
          partOfSpeech: targetWord.partOfSpeech,
          translation: targetWord.translation,
          definition: targetWord.definition,
          contextSentence: targetWord.contextSentence
        }
      };
    });
  };

  // Start or Restart Quiz
  const startQuiz = (count = quizQuestionCount, mode = quizModeType) => {
    const questions = generateQuizQuestions(words, count, mode);
    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setSelectedQuizOption(null);
    setIsQuizAnswerSubmitted(false);
    setQuizScore(0);
    setQuizStreak(0);
    setQuizMaxStreak(0);
    setQuizUserAnswers([]);
    setHasAppliedMastery(false);
    setQuizStatus('playing');

    if (questions[0] && questions[0].type === 'audio') {
      setTimeout(() => {
        playSpeech(questions[0].audioWord);
      }, 400);
    }
  };

  // Option selection handler
  const handleSelectQuizOption = (optionIndex) => {
    if (isQuizAnswerSubmitted || !quizQuestions[currentQuizIndex]) return;

    setSelectedQuizOption(optionIndex);
    setIsQuizAnswerSubmitted(true);

    const currentQ = quizQuestions[currentQuizIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    const newStreak = isCorrect ? quizStreak + 1 : 0;
    setQuizStreak(newStreak);
    if (newStreak > quizMaxStreak) {
      setQuizMaxStreak(newStreak);
    }

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    playSpeech(currentQ.targetWord.word);

    setQuizUserAnswers(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        wordId: currentQ.wordId,
        word: currentQ.targetWord.word,
        translation: currentQ.targetWord.translation,
        questionText: currentQ.questionText,
        selectedOption: currentQ.options[optionIndex],
        correctOption: currentQ.correctAnswer,
        isCorrect,
        explanation: currentQ.explanation
      }
    ]);
  };

  // Next question handler
  const handleNextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizQuestions.length) {
      const nextIdx = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIdx);
      setSelectedQuizOption(null);
      setIsQuizAnswerSubmitted(false);

      if (quizQuestions[nextIdx] && quizQuestions[nextIdx].type === 'audio') {
        setTimeout(() => {
          playSpeech(quizQuestions[nextIdx].audioWord);
        }, 350);
      }
    } else {
      setQuizStatus('completed');
    }
  };

  // Apply quiz performance to update saved words mastery status
  const handleApplyQuizMastery = () => {
    if (hasAppliedMastery || quizUserAnswers.length === 0) return;

    quizUserAnswers.forEach(ans => {
      if (ans.isCorrect) {
        onUpdateWordStatus(ans.wordId, 'Mastered');
      } else {
        onUpdateWordStatus(ans.wordId, 'Needs Review');
      }
    });

    setHasAppliedMastery(true);
  };

  // Filtered words
  const filteredWords = words.filter(item => {
    const matchesSearch = 
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.definition && item.definition.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Analytics stats
  const totalCount = words.length;
  const masteredCount = words.filter(w => w.status === 'Mastered').length;
  const learningCount = words.filter(w => w.status === 'Learning').length;
  const needsReviewCount = words.filter(w => w.status === 'Needs Review').length;
  const masteryPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // Flashcard controls
  const activeFlashcardList = filteredWords.length > 0 ? filteredWords : words;
  const currentCard = activeFlashcardList[currentCardIndex] || activeFlashcardList[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % activeFlashcardList.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + activeFlashcardList.length) % activeFlashcardList.length);
  };

  const handleFlashcardStatus = (newStatus) => {
    if (currentCard) {
      onUpdateWordStatus(currentCard.id, newStatus);
      handleNextCard();
    }
  };

  // Add word submit
  const handleAddNewWordSubmit = (e) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;

    onAddWord({
      id: `custom-w-${Date.now()}`,
      word: newWord.trim(),
      phonetic: newPhonetic.trim() || `/${newWord.toLowerCase().trim()}/`,
      partOfSpeech: 'Custom Term',
      translation: newTranslation.trim(),
      language: 'Hindi',
      definition: newDefinition.trim() || 'Custom added vocabulary entry.',
      contextSentence: newContext.trim() || `Example with ${newWord}.`,
      status: 'Learning',
      notes: 'Added manually to My Words.',
      tags: ['Personal', 'Custom'],
      dateAdded: new Date().toISOString().split('T')[0],
      reviewCount: 0
    });

    setNewWord('');
    setNewPhonetic('');
    setNewTranslation('');
    setNewDefinition('');
    setNewContext('');
    setShowAddModal(false);
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `paarth-words-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Words & Flashcards
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              {totalCount} Saved
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Personal vocabulary bank captured during your bilingual reading sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Export vocabulary as JSON"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Words */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Words
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalCount}</div>
          <p className="text-xs text-slate-500 mt-1">Across all reading material</p>
        </div>

        {/* Mastered */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Mastered
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{masteredCount}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {masteryPercentage}% rate
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Confident retention</p>
        </div>

        {/* Learning */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
              In Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-600">{learningCount}</div>
          <p className="text-xs text-slate-500 mt-1">Scheduled in practice</p>
        </div>

        {/* Needs Review */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Needs Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{needsReviewCount}</div>
          <p className="text-xs text-slate-500 mt-1">Tricky or recently missed</p>
        </div>

        {/* Practice Quiz Banner Card */}
        <div 
          onClick={() => {
            setViewMode('quiz');
            startQuiz();
          }}
          className="bg-gradient-to-br from-brand-600 via-brand-700 to-sky-600 rounded-2xl p-5 shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md hover:scale-[1.005] transition-all group col-span-2 lg:col-span-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Interactive Vocabulary Quiz</h3>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full shadow-2xs">
                  AI Practice
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5 max-w-xl">
                Test your memory with multiple choice translation questions, definitions, and pronunciation audio challenges generated from your saved words!
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-700 font-bold text-xs shadow-xs hover:bg-sky-50 transition-colors shrink-0 group-hover:translate-x-1"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Quiz ({words.length > 0 ? Math.min(5, words.length) : 5} Qs)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search word, Hindi translation, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Tabs & View Switcher */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({words.length})
            </button>
            <button
              onClick={() => setStatusFilter('Learning')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'Learning' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Learning ({learningCount})
            </button>
            <button
              onClick={() => setStatusFilter('Needs Review')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'Needs Review' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Review ({needsReviewCount})
            </button>
            <button
              onClick={() => setStatusFilter('Mastered')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'Mastered' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Word Cards</span>
            </button>
            <button
              onClick={() => {
                setViewMode('flashcard');
                setCurrentCardIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'flashcard' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </button>
            <button
              onClick={() => {
                setViewMode('quiz');
                if (quizQuestions.length === 0) {
                  startQuiz();
                }
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'quiz' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Quiz Mode</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded-full font-bold">New</span>
            </button>
          </div>

        </div>

      </div>

      {/* VIEW 0: Interactive Vocabulary Quiz */}
      {viewMode === 'quiz' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          
          {/* Quiz Top Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Vocabulary Quiz Challenge</h2>
                <p className="text-[11px] text-slate-500">
                  {quizStatus === 'completed' ? 'Quiz Completed' : `Active challenge from ${words.length > 0 ? words.length : 'sample'} saved words`}
                </p>
              </div>
            </div>

            {/* Mode & Question Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={quizModeType}
                onChange={(e) => {
                  const newMode = e.target.value;
                  setQuizModeType(newMode);
                  startQuiz(quizQuestionCount, newMode);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="mixed">Mixed Question Types</option>
                <option value="en_to_hi">English ➔ Hindi Translation</option>
                <option value="hi_to_en">Hindi ➔ English Translation</option>
                <option value="definition">Definition Match</option>
                <option value="audio">Audio Listening Challenge</option>
              </select>

              <select
                value={quizQuestionCount}
                onChange={(e) => {
                  const newCount = Number(e.target.value);
                  setQuizQuestionCount(newCount);
                  startQuiz(newCount, quizModeType);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={Math.max(15, words.length)}>All Words</option>
              </select>

              <button
                type="button"
                onClick={() => startQuiz(quizQuestionCount, quizModeType)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                title="Restart with new questions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          {/* ACTIVE QUIZ QUESTION */}
          {quizStatus === 'playing' && quizQuestions.length > 0 && (
            <div className="space-y-4">
              
              {/* Progress & Live Score Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5 text-brand-700 font-bold">
                    <span>Question {currentQuizIndex + 1}</span>
                    <span className="text-slate-400 font-normal">of {quizQuestions.length}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{quizStreak} Streak</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Score: {quizScore}</span>
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-brand-600 via-sky-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((currentQuizIndex + 1) / quizQuestions.length) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const currentQ = quizQuestions[currentQuizIndex];
                if (!currentQ) return null;

                return (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-soft space-y-6">
                    
                    {/* Question Header & Type Badge */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                        <Sparkles className="w-3 h-3 text-brand-600" />
                        <span>
                          {currentQ.type === 'en_to_hi' && 'English ➔ Hindi Meaning'}
                          {currentQ.type === 'hi_to_en' && 'Hindi ➔ English Match'}
                          {currentQ.type === 'definition' && 'Definition Match'}
                          {currentQ.type === 'audio' && 'Pronunciation Listening Quiz'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => playSpeech(currentQ.audioWord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 text-xs font-semibold transition-colors"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-4 h-4 text-brand-600" />
                        <span>Pronounce</span>
                      </button>
                    </div>

                    {/* Question Prompt */}
                    <div className="space-y-2 text-center py-2">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                        {currentQ.questionText}
                      </h3>
                      {currentQ.subText && (
                        <p className="text-xs sm:text-sm text-slate-500 italic max-w-xl mx-auto">
                          {currentQ.subText}
                        </p>
                      )}
                    </div>

                    {/* 4 Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {currentQ.options.map((option, optIdx) => {
                        const isSelected = selectedQuizOption === optIdx;
                        const isCorrectOption = optIdx === currentQ.correctIndex;
                        const optionLetters = ['A', 'B', 'C', 'D'];

                        let optionStyle = "border-slate-200 hover:border-brand-400 hover:bg-slate-50/70 text-slate-800 bg-white";
                        if (isQuizAnswerSubmitted) {
                          if (isCorrectOption) {
                            optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-200 shadow-xs";
                          } else if (isSelected && !isCorrectOption) {
                            optionStyle = "border-rose-400 bg-rose-50 text-rose-950 line-through ring-2 ring-rose-200";
                          } else {
                            optionStyle = "border-slate-200 bg-slate-50/50 text-slate-400 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isQuizAnswerSubmitted}
                            onClick={() => handleSelectQuizOption(optIdx)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 flex items-center justify-between gap-3 text-sm font-medium ${optionStyle} ${
                              !isQuizAnswerSubmitted ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                isQuizAnswerSubmitted && isCorrectOption
                                  ? 'bg-emerald-600 text-white'
                                  : isQuizAnswerSubmitted && isSelected && !isCorrectOption
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {optionLetters[optIdx]}
                              </span>
                              <span className="font-hindi text-sm sm:text-base leading-snug">
                                {option}
                              </span>
                            </div>

                            {isQuizAnswerSubmitted && isCorrectOption && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                            {isQuizAnswerSubmitted && isSelected && !isCorrectOption && (
                              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Educational Explanation Box (Appears after answer) */}
                    {isQuizAnswerSubmitted && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {currentQ.explanation.word}
                            </span>
                            {currentQ.explanation.phonetic && (
                              <span className="text-xs font-mono text-slate-500">
                                {currentQ.explanation.phonetic}
                              </span>
                            )}
                            {currentQ.explanation.partOfSpeech && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                                {currentQ.explanation.partOfSpeech}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-hindi font-bold text-brand-700">
                            {currentQ.explanation.translation}
                          </span>
                        </div>

                        {currentQ.explanation.definition && (
                          <p className="text-xs text-slate-700">
                            <strong>Meaning:</strong> {currentQ.explanation.definition}
                          </p>
                        )}

                        {currentQ.explanation.contextSentence && (
                          <p className="text-xs italic text-slate-500 font-serif">
                            "{currentQ.explanation.contextSentence}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    {isQuizAnswerSubmitted && (
                      <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleNextQuizQuestion}
                          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-95"
                        >
                          <span>{currentQuizIndex + 1 < quizQuestions.length ? 'Next Question' : 'View Results'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()}

            </div>
          )}

          {/* QUIZ COMPLETED / RESULTS SCREEN */}
          {quizStatus === 'completed' && (
            <div className="space-y-6">
              
              {/* Hero Results Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-soft text-center space-y-6">
                
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-300 text-white mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                    Quiz Completed!
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {Math.round((quizScore / quizQuestions.length) * 100)}% Accuracy
                  </h2>
                  <p className="text-sm font-medium text-slate-600 max-w-md mx-auto">
                    {quizScore === quizQuestions.length && '🏆 Perfect Score! Outstanding bilingual retention and mastery!'}
                    {quizScore < quizQuestions.length && quizScore >= quizQuestions.length * 0.7 && '🌟 Great Job! Strong grasp of your saved vocabulary!'}
                    {quizScore < quizQuestions.length * 0.7 && '📖 Solid effort! Review the tricky words below to reinforce your memory.'}
                  </p>
                </div>

                {/* Score Stats Grid */}
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                    <span className="text-2xl font-extrabold text-emerald-700">{quizScore}</span>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">Correct</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                    <span className="text-2xl font-extrabold text-rose-700">{quizQuestions.length - quizScore}</span>
                    <p className="text-[11px] font-semibold text-rose-800 mt-0.5">Missed</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                    <span className="text-2xl font-extrabold text-amber-700">🔥 {quizMaxStreak}</span>
                    <p className="text-[11px] font-semibold text-amber-800 mt-0.5">Max Streak</p>
                  </div>
                </div>

                {/* 1-Click Update Word Mastery Button */}
                <div className="max-w-md mx-auto pt-2">
                  <button
                    type="button"
                    onClick={handleApplyQuizMastery}
                    disabled={hasAppliedMastery}
                    className={`w-full py-3 px-5 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                      hasAppliedMastery
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                    }`}
                  >
                    {hasAppliedMastery ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-700" />
                        <span>✓ Mastery Applied! Words updated in My Words</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>🚀 Apply Quiz Results to My Words ({quizScore} Mastered, {quizQuestions.length - quizScore} Needs Review)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Automatically updates the learning status of these words in your vocabulary bank.
                  </p>
                </div>

                {/* Quiz Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => startQuiz(quizQuestionCount, quizModeType)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Take Another Quiz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Grid className="w-4 h-4" />
                    <span>Back to Word Cards</span>
                  </button>
                </div>

              </div>

              {/* Review Question Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Question Breakdown Review</h3>
                  <span className="text-xs text-slate-500">{quizUserAnswers.length} Questions Answered</span>
                </div>

                <div className="space-y-3">
                  {quizUserAnswers.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                        item.isCorrect ? 'bg-emerald-50/40 border-emerald-200/70' : 'bg-rose-50/40 border-rose-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                            item.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">{item.word}</span>
                          <button
                            type="button"
                            onClick={() => playSpeech(item.word)}
                            className="p-1 rounded text-slate-400 hover:text-brand-600"
                            title="Listen"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.isCorrect ? 'Correct' : 'Needs Review'}
                        </span>
                      </div>

                      <p className="text-slate-600 font-hindi">
                        <strong>Correct Answer:</strong> {item.correctOption}
                      </p>
                      {!item.isCorrect && (
                        <p className="text-rose-700 font-hindi">
                          <strong>Your Answer:</strong> <span className="line-through">{item.selectedOption}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* VIEW 1: Interactive Flashcard Practice Mode */}
      {viewMode === 'flashcard' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {activeFlashcardList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-slate-500">No words found in this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Flashcard Header Controls */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-medium">
                <span>
                  Card {currentCardIndex + 1} of {activeFlashcardList.length}
                </span>
                <span className="flex items-center gap-1 text-brand-600 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tap card to flip</span>
                </span>
              </div>

              {/* 3D Flip Card */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer min-h-[340px] rounded-3xl bg-white border-2 border-brand-200 hover:border-brand-400 p-8 shadow-elevated flex flex-col justify-between transition-all duration-300 relative group select-none"
              >
                
                {/* Front of Card */}
                {!isFlipped ? (
                  <div className="space-y-6 text-center my-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                      <span>{currentCard.partOfSpeech}</span>
                      <span>•</span>
                      <span>{currentCard.language || 'Bilingual'}</span>
                    </div>

                    <div>
                      <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        {currentCard.word}
                      </h2>
                      <p className="text-sm font-mono text-slate-500 mt-2">{currentCard.phonetic}</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playSpeech(currentCard.word);
                        }}
                        className="p-2.5 rounded-full bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 transition-colors"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-5 h-5 text-brand-600" />
                      </button>
                    </div>

                    {currentCard.contextSentence && (
                      <div className="max-w-md mx-auto pt-4 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Context Sentence
                        </span>
                        <p className="text-sm font-serif italic text-slate-700 leading-relaxed">
                          "{currentCard.contextSentence}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Back of Card (Flipped) */
                  <div className="space-y-5 text-center my-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Translation Revealed</span>
                    </div>

                    <div>
                      <h3 className="text-3xl sm:text-4xl font-bold text-brand-700 font-hindi">
                        {currentCard.translation}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Target meaning</p>
                    </div>

                    <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-left space-y-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Meaning
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 font-medium">
                          {currentCard.definition}
                        </p>
                      </div>

                      {currentCard.notes && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                            Memory Tip / Context
                          </span>
                          <p className="text-xs text-slate-600">
                            {currentCard.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Footer indicator */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click card to {isFlipped ? 'view front' : 'reveal back'}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                    currentCard.status === 'Mastered' ? 'bg-emerald-50 text-emerald-700' :
                    currentCard.status === 'Needs Review' ? 'bg-amber-50 text-amber-700' :
                    'bg-sky-50 text-sky-700'
                  }`}>
                    Status: {currentCard.status}
                  </span>
                </div>

              </div>

              {/* Navigation & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePrevCard}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleFlashcardStatus('Needs Review')}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                  >
                    Need Practice
                  </button>
                  <button
                    onClick={() => handleFlashcardStatus('Mastered')}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>I Got This!</span>
                  </button>
                </div>

                <button
                  onClick={handleNextCard}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Responsive Card Grid View */}
      {viewMode === 'grid' && (
        <div>
          {filteredWords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No words match your search</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Try a different keyword or open the AI Reader to save new words while exploring stories.
              </p>
              <button
                onClick={() => { setActivePage('reader'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
              >
                Go to AI Reader
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWords.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-soft hover:border-brand-300 transition-all duration-200 flex flex-col justify-between space-y-4 group"
                >
                  
                  {/* Top Bar: Word, phonetic, audio */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                            {item.word}
                          </h3>
                          <button
                            onClick={() => playSpeech(item.word)}
                            className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                            title="Pronounce"
                          >
                            <Volume2 className="w-4 h-4 text-brand-600" />
                          </button>
                        </div>
                        <p className="text-xs font-mono text-slate-500">{item.phonetic}</p>
                      </div>

                      {/* Status Selector Pill */}
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateWordStatus(item.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                          item.status === 'Mastered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'Needs Review'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        <option value="Learning">Learning</option>
                        <option value="Needs Review">Needs Review</option>
                        <option value="Mastered">Mastered</option>
                      </select>
                    </div>

                    {/* Translation Pill */}
                    <div className="mt-3 p-2.5 bg-brand-50/70 rounded-xl border border-brand-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block mb-0.5">
                        Translation
                      </span>
                      <p className="text-base font-bold text-slate-900 font-hindi">
                        {item.translation}
                      </p>
                    </div>

                    {/* Meaning */}
                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
                      {item.definition}
                    </p>

                    {/* Context sentence */}
                    {item.contextSentence && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs font-serif italic text-slate-700 border border-slate-100">
                        "{item.contextSentence}"
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Tags & Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.map((t, tidx) => (
                        <span key={tidx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => onDeleteWord(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove from saved words"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Add Word Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Add Vocabulary Word</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewWordSubmit} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Word (Source) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Epiphany"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phonetics (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /ɪˈpɪf.ən.i/"
                    value={newPhonetic}
                    onChange={(e) => setNewPhonetic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Translation (Hindi / Target) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. आत्मज्ञान / एकाएक बोध"
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-hindi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Definition / Meaning
                </label>
                <input
                  type="text"
                  placeholder="A moment of sudden revelation or insight..."
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Context Sentence
                </label>
                <textarea
                  rows={2}
                  placeholder="Sentence where you encountered this word..."
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-serif"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs"
                >
                  Save to My Words
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
