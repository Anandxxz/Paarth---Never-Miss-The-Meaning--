import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  Volume2, 
  Copy, 
  Check, 
  HelpCircle, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  BookOpen,
  Languages,
  CheckCircle2
} from 'lucide-react';
import { playSpeech as playAudibleSpeech, stopSpeech } from '../utils/speechService';

export default function AiTutorDrawer({
  isOpen,
  onClose,
  storyTitle,
  activeParagraph,
  activeParagraphIndex,
  totalParagraphs,
  fullText,
  sourceLang,
  sourceLangName,
  targetLang,
  targetLangName,
  detectedWords = []
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Suggested prompt chips tailored to the current context
  const SUGGESTED_CHIPS = [
    { label: '📝 Summarize paragraph', prompt: 'Summarize the currently selected paragraph in simple, clear terms with its key takeaway.' },
    { label: '💡 Metaphors & tone', prompt: 'Explain the literary tone, deeper metaphors, and hidden meaning behind this excerpt.' },
    { label: '❓ Quiz my comprehension', prompt: 'Create 1 multiple-choice comprehension question based on this excerpt to test my understanding, with 4 options and the correct answer.' },
    { label: '🇮🇳 Explain in Hindi', prompt: 'Explain the core theme and difficult words of this paragraph in simple, conversational Hindi (हिन्दी).' },
    { label: '🌺 Explain in Marathi', prompt: 'Explain the core message and subtle nuances of this paragraph in natural Marathi (मराठी).' },
    { label: '✍️ Usage examples', prompt: 'Pick the 2 most important words from this paragraph and provide everyday conversational examples showing how to use them.' }
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Reset or initialize greeting when a new story is loaded
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `**Namaste! I am your Paarth AI Reading Tutor.**\n\nI'm actively following along with **"${storyTitle}"**. Ask me anything about the currently selected paragraph, cultural nuances, or vocabulary. You can also click any of the prompt chips below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [storyTitle]);

  // Send message to backend
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Recent history for multi-turn conversation (last 6 messages)
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          storyTitle,
          activeParagraph,
          fullText,
          sourceLang: sourceLangName || sourceLang,
          targetLang: targetLangName || targetLang,
          detectedWords,
          history: historyPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer from AI tutor.');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

    } catch (err) {
      console.error('Tutor chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Notice:** ${
            err.message === 'Failed to fetch' || err.message === 'fetch failed'
              ? 'Could not reach the Paarth backend on http://localhost:5001. Please ensure the backend server is running.'
              : (err.message || 'Could not connect to Paarth AI.')
          }`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // High-fidelity speech pronunciation for tutor responses
  const handlePlayAudio = (text, idx) => {
    if (speakingMsgIdx === idx) {
      stopSpeech();
      setSpeakingMsgIdx(null);
      return;
    }

    setSpeakingMsgIdx(idx);
    const isDevanagari = /[\u0900-\u097F]/.test(text);
    const lang = isDevanagari ? (targetLang === 'mr' ? 'mr-IN' : 'hi-IN') : 'en-US';

    playAudibleSpeech(text, {
      lang,
      rate: isDevanagari ? 0.92 : 0.96,
      volume: 1.0,
      pitch: 1.0,
      onStart: () => setSpeakingMsgIdx(idx),
      onEnd: () => setSpeakingMsgIdx(null),
      onError: () => setSpeakingMsgIdx(null)
    });
  };

  // Copy text to clipboard
  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Reset conversation
  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation refreshed! Ask me anything about **Paragraph ${activeParagraphIndex + 1}** of **"${storyTitle}"**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Render markdown with simple bold and lists
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      // Bold replacer
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <li key={lIdx} className="ml-4 list-disc text-slate-700 leading-relaxed my-0.5">
            {formattedParts}
          </li>
        );
      }

      if (line.trim().startsWith('#')) {
        return (
          <h4 key={lIdx} className="font-bold text-brand-900 mt-2 mb-1">
            {line.replace(/^#+\s*/, '')}
          </h4>
        );
      }

      return (
        <p key={lIdx} className="mb-1 leading-relaxed text-slate-700">
          {formattedParts}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[500px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250">
      
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200/80 bg-gradient-to-r from-brand-50/70 via-sky-50/50 to-indigo-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Ask Paarth AI</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-700 border border-brand-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-brand-600" />
                <span>Reading Tutor</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
              {storyTitle} • Paragraph {activeParagraphIndex + 1}/{totalParagraphs}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            title="Close Tutor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Collapsible Active Excerpt Banner */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs shrink-0">
        <button
          onClick={() => setShowContextPreview(!showContextPreview)}
          className="w-full flex items-center justify-between font-semibold text-slate-600 hover:text-brand-700 transition-colors"
        >
          <div className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="truncate">
              Focus: Paragraph {activeParagraphIndex + 1} ({activeParagraph?.source?.slice(0, 40)}...)
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-[11px] text-slate-400">
            <span>{showContextPreview ? 'Hide' : 'View'}</span>
            {showContextPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showContextPreview && (
          <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1.5 animate-in fade-in duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {sourceLangName || 'Source'}:
              </span>
              <p className="font-serif text-[11.5px] leading-relaxed text-slate-800">
                {activeParagraph?.source}
              </p>
            </div>
            {activeParagraph?.target && (
              <div className="pt-1.5 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                  {targetLangName || 'Translation'}:
                </span>
                <p className="font-hindi text-[11.5px] leading-relaxed text-slate-700">
                  {activeParagraph?.target}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 bg-white border-b border-slate-100 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
          Suggested Questions for this Excerpt:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SUGGESTED_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={isLoading}
              className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200/80 hover:border-brand-200 transition-all font-medium disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-150`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                {!isUser && <Bot className="w-3 h-3 text-brand-600" />}
                <span>{isUser ? 'You' : 'Paarth AI Tutor'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] rounded-2xl p-3.5 text-xs sm:text-[13px] shadow-xs ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-xs shadow-brand-500/10'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    {renderFormattedContent(msg.content)}
                  </div>
                )}
              </div>

              {/* Action buttons on bot messages */}
              {!isUser && !msg.isError && (
                <div className="flex items-center gap-1 mt-1 px-1">
                  <button
                    onClick={() => handlePlayAudio(msg.content, idx)}
                    className={`p-1 rounded transition-colors ${
                      speakingMsgIdx === idx 
                        ? 'text-brand-600 bg-brand-50 animate-pulse' 
                        : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'
                    }`}
                    title={speakingMsgIdx === idx ? 'Click to stop audio' : 'Listen aloud'}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopyText(msg.content, idx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Copy explanation"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Thinking Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
              <Bot className="w-3 h-3 text-brand-600" />
              <span>Paarth AI Tutor</span>
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-500 flex items-center gap-2.5 text-xs shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Analyzing context with Gemini AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about this paragraph or word..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm bg-slate-50/50 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-1.5 p-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          Powered by Google Gemini AI • Ask in English, Hindi (हिन्दी), or Marathi (मराठी)
        </p>
      </div>

    </div>
  );
}
