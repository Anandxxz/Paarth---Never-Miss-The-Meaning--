import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  Bookmark, 
  Volume2, 
  SplitSquareVertical, 
  Layers, 
  Brain, 
  Compass, 
  CheckCircle2, 
  Globe, 
  Zap,
  HelpCircle,
  ChevronDown,
  FileText
} from 'lucide-react';
import { DICTIONARY_DATABASE } from '../data/mockData';
import { playSpeech as playAudibleSpeech } from '../utils/speechService';

export default function HomePage({ setActivePage, onSelectWord }) {
  // Mini interactive demo state on the hero section
  const [selectedDemoWord, setSelectedDemoWord] = useState('magnificent');

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState(0); // 0 open by default

  const faqs = [
    {
      question: "What is Paarth and how does the bilingual reader work?",
      answer: "Paarth (पार्थ) is an AI-powered bilingual reading companion built for language learners, literature enthusiasts, and students. It presents literature, essays, or documents with synchronized side-by-side paragraphs in two languages (e.g., English and Hindi or Marathi). As you read, tap any word or phrase to see instant contextual meanings, grammatical role, phonetic pronunciation, and natural usage examples."
    },
    {
      question: "Which languages are supported for translation and reading?",
      answer: "Paarth offers full bidirectional translation and vocabulary intelligence across English, Hindi (हिन्दी), and Marathi (मराठी). You can read English literature with Hindi or Marathi translations, or read Hindi/Marathi native stories with aligned English translations. Extensible support is also architected for Sanskrit, Tamil, Spanish, and French."
    },
    {
      question: "Can I upload and read PDFs and photo images?",
      answer: "Yes! Paarth includes an AI Document & Photo Reader. You can drag and drop or upload PDF documents, scanned book pages, reports, and images (JPG, PNG, WebP, PDF up to 15MB). Gemini Multimodal AI extracts the text with paragraph formatting, translates it into your chosen language (Hindi, Marathi, or English), highlights difficult terms, and loads it directly into the dual-reading canvas."
    },
    {
      question: "How do Reader Levels 1, 2, and 3 work?",
      answer: "Reader levels adjust the vocabulary detection sensitivity to match your learning stage: Level 1 (Beginner/Learner) generously detects 12 to 25 words including descriptive words and idioms; Level 2 (Intermediate) detects 6 to 12 curated literary and nuanced expressions; Level 3 (Advanced/Technical) filters strictly for 3 to 6 rare, academic, domain-specific, or technical terms."
    },
    {
      question: "How do the saved vocabulary bank and Quiz challenge help me?",
      answer: "Every word you click or save is stored in your personal 'My Words' repository. You can practice with 3D interactive flashcards or take dynamically generated AI Quizzes featuring English-to-Hindi/Marathi translation, definition matching, and audio listening challenges. With 1 click on the quiz results screen, you can automatically update word mastery statuses to 'Mastered' or 'Needs Review'."
    },
    {
      question: "How does the 'Ask Paarth AI' Reading Tutor work?",
      answer: "While reading any story or uploaded PDF/photo in the Dual Reader, click 'Ask AI Tutor' or tap the floating tutor pill. A context-aware side drawer opens where you can ask anything about the specific paragraph you're reading. Paarth can summarize the excerpt, explain metaphorical and cultural nuances in Hindi or Marathi, generate custom comprehension quizzes, or provide real-world usage examples on the spot."
    },
    {
      question: "Is my data and Google Gemini API key secure?",
      answer: "Yes. All AI operations are executed strictly through your local Node.js/Express backend on port 5001. Your GEMINI_API_KEY is stored in backend environment variables and is never exposed to the frontend or browser. Uploaded documents and images are processed in memory and never permanently written to disk."
    }
  ];

  const demoWordData = DICTIONARY_DATABASE[selectedDemoWord] || {
    word: selectedDemoWord,
    phonetic: '/.../',
    partOfSpeech: 'Word',
    translation: 'अनुवाद',
    definition: 'Contextual AI translation.',
    explanation: 'Tap any word in the reader to inspect its meaning.'
  };

  const playSpeech = (text) => {
    if (!text) return;
    const isDevanagari = /[\u0900-\u097F]/.test(text);
    playAudibleSpeech(text, {
      lang: isDevanagari ? 'hi-IN' : 'en-US',
      rate: isDevanagari ? 0.92 : 0.96,
      volume: 1.0,
      pitch: 1.0
    });
  };

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-100/50 via-sky-50/30 to-transparent -z-10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs sm:text-sm font-medium shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
              <span>Next-Gen Language Immersion</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-normal">English ⇄ Indian & Global Languages</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Read foreign literature with your personal{' '}
              <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-sky-600 bg-clip-text text-transparent">
                AI Reading Companion
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Paarth empowers you to read novels, essays, and articles in two languages side-by-side. 
              Tap any word for instant contextual nuances, native pronunciation, and automatic vocabulary retention.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={() => { setActivePage('reader'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-base shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" />
                <span>Launch AI Reader</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                onClick={() => { setActivePage('words'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-700 font-semibold text-base border border-slate-200 shadow-xs transition-all hover:border-brand-200"
              >
                <Bookmark className="w-5 h-5 text-brand-600" />
                <span>Saved Words & Flashcards</span>
              </button>
            </div>

            {/* Micro social proof / features */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Synchronized Dual-Text
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                AI Photo Reader (Vision OCR)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Interactive Tap-to-Translate
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Spaced Repetition Storage
              </span>
            </div>

          </div>

          {/* Interactive Live Demo Preview Box */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-elevated overflow-hidden">
              
              {/* Window header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                  </div>
                  <span className="ml-2 font-semibold text-slate-700">Paarth Live Reader Preview</span>
                  <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-700 text-[10px] font-bold">
                    Try Clicking Words Below
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px] hidden sm:block">
                  English ⇄ हिन्दी (Hindi)
                </div>
              </div>

              {/* Window Body: Interactive bilingual snippet */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Dual Column Snippet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-xl border border-slate-100">
                  
                  {/* Left: English with clickable words */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-brand-700 uppercase tracking-wider">
                      <span>Source Text (English)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Tap highlighted terms</span>
                    </div>
                    <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-serif">
                      "Once when I was six years old I saw a{' '}
                      <button
                        onClick={() => setSelectedDemoWord('magnificent')}
                        className={`clickable-word font-medium text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 ${
                          selectedDemoWord === 'magnificent' ? 'active-word bg-brand-100' : ''
                        }`}
                      >
                        magnificent
                      </button>{' '}
                      picture in a book about the{' '}
                      <button
                        onClick={() => setSelectedDemoWord('primeval')}
                        className={`clickable-word font-medium text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 ${
                          selectedDemoWord === 'primeval' ? 'active-word bg-brand-100' : ''
                        }`}
                      >
                        primeval
                      </button>{' '}
                      forest. I{' '}
                      <button
                        onClick={() => setSelectedDemoWord('pondered')}
                        className={`clickable-word font-medium text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 ${
                          selectedDemoWord === 'pondered' ? 'active-word bg-brand-100' : ''
                        }`}
                      >
                        pondered
                      </button>{' '}
                      deeply over the adventures of the jungle."
                    </p>
                  </div>

                  {/* Right: Hindi Translation */}
                  <div className="space-y-2 md:border-l md:border-slate-200 md:pl-6">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span>Target Text (हिन्दी)</span>
                      <span className="text-[10px] text-brand-600 font-semibold bg-brand-50 px-2 py-0.5 rounded">
                        Aligned
                      </span>
                    </div>
                    <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-hindi">
                      "एक बार जब मैं छह साल का था, मैंने प्राचीन आदिम जंगल के बारे में एक शानदार चित्र देखा था। तब मैंने जंगल के कारनामों पर गहराई से विचार किया।"
                    </p>
                  </div>

                </div>

                {/* Interactive Word Inspector Card Result */}
                <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-sky-50/40 p-5 shadow-xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-100">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-900">{demoWordData.word}</h3>
                          <span className="text-xs font-mono text-slate-500">{demoWordData.phonetic}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                            {demoWordData.partOfSpeech}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-brand-700 mt-0.5 font-hindi">
                          {demoWordData.translation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playSpeech(demoWordData.word)}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-600 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-medium"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-4 h-4 text-brand-600" />
                        <span>Listen</span>
                      </button>
                      <button
                        onClick={() => {
                          setActivePage('reader');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                      >
                        <span>Inspect in Full Reader</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs sm:text-sm">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-0.5">Core Meaning:</span>
                      <p className="text-slate-600 leading-snug">{demoWordData.definition}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-brand-800 block mb-0.5">Contextual Nuance:</span>
                      <p className="text-slate-600 leading-snug">{demoWordData.explanation}</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Feature Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Engineered for Deep Comprehension
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Why traditional translation breaks your reading flow
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Copy-pasting into dictionary tabs shatters your focus. Paarth brings intelligent, contextual assistance right into your reading view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-soft hover:shadow-elevated hover:border-brand-300 transition-all duration-200 group">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center mb-5 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <SplitSquareVertical className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Synchronized Dual View</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Read in side-by-side split columns or sentence-by-sentence interlinear mode with balanced visual line alignment.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-soft hover:shadow-elevated hover:border-brand-300 transition-all duration-200 group">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mb-5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Contextual AI Nuance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Understand why an author picked an exact word. Dissect idioms, tone, and grammar without leaving the page.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-soft hover:shadow-elevated hover:border-brand-300 transition-all duration-200 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart "My Words" Bank</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Save unfamiliar terms with one click. Words automatically link to sentence contexts and feed into spaced repetition flashcards.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-soft hover:shadow-elevated hover:border-brand-300 transition-all duration-200 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Audio Pronunciation</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hear accurate phonetics and natural speech cadence for any word or sentence, reinforcing auditory memory.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-b from-slate-900 to-navy-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 shadow-xl relative overflow-hidden">
          
          <div className="relative z-10 max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400 bg-brand-950/80 border border-brand-800 px-3 py-1 rounded-full">
              Seamless 3-Step Routine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4">
              How Paarth turns passive reading into fluent retention
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-10">
              Designed specifically for intermediate readers looking to bridge the gap into native literature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            
            {/* Step 1 */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-lg">
                01
              </div>
              <h3 className="text-xl font-bold text-white">Choose or Paste Text</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pick from classic literature and science articles, or paste any text you want to read bilingually.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-lg">
                02
              </div>
              <h3 className="text-xl font-bold text-white">Read with Dual-Sync</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Enjoy side-by-side paragraphs. Click any confusing word for contextual phonetics and instant Hindi / English translations.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-lg">
                03
              </div>
              <h3 className="text-xl font-bold text-white">Master In "My Words"</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Review your saved vocabulary using interactive flashcards, track mastery status, and build permanent fluency.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center relative z-10">
            <button
              onClick={() => { setActivePage('reader'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-base shadow-lg shadow-brand-500/25 transition-all hover:scale-105"
            >
              <BookOpen className="w-5 h-5" />
              <span>Start Reading with Paarth Now</span>
            </button>
          </div>

        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8" id="faq">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            Everything you need to know about reading, translating, uploading documents, and learning with Paarth.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-brand-300 transition-all duration-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-brand-700 transition-colors cursor-pointer select-none"
                >
                  <span className="text-base sm:text-lg flex items-center gap-3">
                    <span className="text-xs font-bold w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 border border-brand-200">
                      0{idx + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 bg-brand-50 text-brand-700' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 animate-in fade-in duration-150">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Support Note */}
        <div className="mt-8 p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sky-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
            <span>Have a custom text, book PDF, or snapshot to read? Try our AI reader right now.</span>
          </div>
          <button
            onClick={() => { setActivePage('reader'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shrink-0 shadow-xs"
          >
            Open Reader
          </button>
        </div>
      </section>

    </div>
  );
}
