import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Volume2, 
  Bookmark, 
  BookmarkCheck, 
  Type, 
  Columns2, 
  AlignJustify, 
  Check, 
  ChevronRight, 
  Globe, 
  RotateCcw, 
  Plus, 
  X,
  HelpCircle,
  ExternalLink,
  SlidersHorizontal,
  Eye,
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  KeyRound,
  GraduationCap,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Trash2,
  CheckCircle2,
  Bot
} from 'lucide-react';
import { SAMPLE_TEXTS, DICTIONARY_DATABASE, SUPPORTED_LANGUAGES } from '../data/mockData';
import AiTutorDrawer from '../components/AiTutorDrawer';
import { playSpeech as playAudibleSpeech, stopSpeech } from '../utils/speechService';

export default function ReaderPage({ savedWords, onSaveWord, setActivePage }) {
  // Active story selection
  const [activeStory, setActiveStory] = useState(SAMPLE_TEXTS[0]);
  
  // AI Tutor drawer state
  const [showTutorDrawer, setShowTutorDrawer] = useState(false);

  // Audio speech status
  const [speakingId, setSpeakingId] = useState(null);
  
  // Custom text modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [customDirection, setCustomDirection] = useState('auto'); // 'auto' | 'en-to-hi' | 'hi-to-en'

  // Reader display preferences
  const [readingMode, setReadingMode] = useState('split'); // 'split' | 'stacked' | 'sourceOnly'
  const [fontSize, setFontSize] = useState('text-lg'); // 'text-base', 'text-lg', 'text-xl'
  const [fontFamily, setFontFamily] = useState('font-serif'); // 'font-serif' | 'font-sans'
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);

  // AI Analysis & Reader Level state
  const [readerLevel, setReaderLevel] = useState(2); // 1 = Beginner, 2 = Intermediate, 3 = Technical Jargon
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisCache, setAnalysisCache] = useState({}); // Cache per `${storyId}_${level}`
  const [detectedWords, setDetectedWords] = useState([]);
  const [backendHealth, setBackendHealth] = useState({ checked: false, geminiConfigured: true });

  // Word inspector & popup state
  const [inspectedWord, setInspectedWord] = useState(null);
  const [inlinePopup, setInlinePopup] = useState(null); // { wordData, x, y } for floating quick popup
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModalTranslating, setIsModalTranslating] = useState(false);

  // Photo Reader state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [photoExtractedData, setPhotoExtractedData] = useState(null);
  const [photoLevel, setPhotoLevel] = useState(2);
  const [photoTargetLang, setPhotoTargetLang] = useState('auto'); // 'auto' | 'Hindi' | 'English'
  const [isDragging, setIsDragging] = useState(false);
  const [photoStories, setPhotoStories] = useState([]);
  const [viewingOriginalPhoto, setViewingOriginalPhoto] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setBackendHealth({ checked: true, geminiConfigured: data.geminiConfigured });
      })
      .catch(err => {
        console.warn('Backend health check warning:', err);
        setBackendHealth({ checked: true, geminiConfigured: false });
      });

    // Check for incoming import from Chrome Extension
    try {
      const params = new URLSearchParams(window.location.search);
      const importText = params.get('importText');
      const title = params.get('title');

      if (importText && importText.trim()) {
        const decodedText = decodeURIComponent(importText).trim();
        const decodedTitle = title ? decodeURIComponent(title).trim() : 'Web Article';
        const sourceParagraphs = decodedText.split('\n\n').filter(p => p.trim());
        const hasDevanagari = /[\u0900-\u097F]/.test(decodedText);

        const newImportStory = {
          id: `ext-${Date.now()}`,
          title: decodedTitle,
          originalTitle: 'Imported from Paarth Chrome Extension',
          category: 'Web Selection',
          level: 'Level 2',
          sourceLang: hasDevanagari ? 'hi' : 'en',
          sourceLangName: hasDevanagari ? 'Hindi (हिन्दी)' : 'English',
          targetLang: hasDevanagari ? 'en' : 'hi',
          targetLangName: hasDevanagari ? 'English' : 'Hindi (हिन्दी)',
          readTime: `${Math.max(1, Math.ceil(decodedText.split(' ').length / 150))} min read`,
          paragraphs: sourceParagraphs.map((src, idx) => ({
            id: `ext-p-${idx + 1}`,
            source: src,
            target: hasDevanagari ? '✨ Gemini AI अंग्रेज़ी अनुवाद तैयार कर रहा है...' : '✨ Gemini AI हिन्दी अनुवाद तैयार कर रहा है...'
          }))
        };

        setActiveStory(newImportStory);
        triggerAutoTranslate(sourceParagraphs, newImportStory.id, hasDevanagari ? 'English' : 'Hindi');

        // Clean query params from browser URL bar without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('Error reading extension import params:', e);
    }
  }, []);

  // Update detected words when story or level changes if cached
  useEffect(() => {
    const cacheKey = `${activeStory.id}_lvl${readerLevel}`;
    if (analysisCache[cacheKey]) {
      setDetectedWords(analysisCache[cacheKey]);
      setAnalysisError(null);
    } else {
      setDetectedWords([]);
    }
  }, [activeStory.id, readerLevel, analysisCache]);

  // Trigger Gemini AI analysis
  const handleAnalyzeArticle = async (selectedLevel = readerLevel) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    const fullArticleText = activeStory.paragraphs.map(p => p.source).join('\n\n');
    const isHindiSource = activeStory.sourceLang === 'hi' || /[\u0900-\u097F]/.test(fullArticleText);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: fullArticleText,
          level: selectedLevel,
          sourceLang: isHindiSource ? 'Hindi' : 'English',
          targetLang: isHindiSource ? 'English' : (activeStory.targetLangName || 'Hindi')
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error ${response.status}`);
      }

      const words = Array.isArray(data.detectedWords) ? data.detectedWords : [];
      const cacheKey = `${activeStory.id}_lvl${selectedLevel}`;
      
      setAnalysisCache(prev => ({
        ...prev,
        [cacheKey]: words
      }));
      setDetectedWords(words);

      // Auto-update paragraph translations if Gemini provided translatedParagraphs
      if (Array.isArray(data.translatedParagraphs) && data.translatedParagraphs.length > 0) {
        setActiveStory(prev => ({
          ...prev,
          paragraphs: prev.paragraphs.map((p, idx) => {
            const isPlaceholder = !p.target || 
              p.target.includes('अनुवाद उपलब्ध नहीं') || 
              p.target.includes('Translating') ||
              p.target.includes('तैयार कर रहा');
            if (isPlaceholder && data.translatedParagraphs[idx]) {
              return { ...p, target: data.translatedParagraphs[idx] };
            }
            return p;
          })
        }));
      }

      // Auto-inspect the first detected word if available
      if (words.length > 0 && !inspectedWord) {
        setInspectedWord({
          ...words[0],
          isAiDetected: true,
          level: selectedLevel,
          sourceLang: activeStory.sourceLang,
          targetLang: activeStory.targetLang
        });
      }

    } catch (err) {
      console.error('Error during AI analysis:', err);
      setAnalysisError(err.message || 'Failed to analyze text with Gemini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto translate paragraphs using Gemini AI (Bidirectional)
  const triggerAutoTranslate = async (sourceParas, storyId, explicitTargetLang) => {
    setIsTranslating(true);
    const hasDevanagari = sourceParas.some(p => /[\u0900-\u097F]/.test(p));
    const effectiveTargetLang = explicitTargetLang || (hasDevanagari ? 'English' : 'Hindi');
    const effectiveSourceLang = hasDevanagari ? 'Hindi' : 'English';

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphs: sourceParas,
          sourceLang: effectiveSourceLang,
          targetLang: effectiveTargetLang
        })
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.translatedParagraphs)) {
        setActiveStory(prev => {
          if (prev.id !== storyId) return prev;
          return {
            ...prev,
            paragraphs: prev.paragraphs.map((p, idx) => ({
              ...p,
              target: data.translatedParagraphs[idx] || p.target
            }))
          };
        });
      }
    } catch (err) {
      console.warn('Auto translation warning:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate directly inside custom modal before importing (Supports Hindi, English & Marathi)
  const handleModalAutoTranslate = async () => {
    if (!customSource.trim()) return;
    setIsModalTranslating(true);

    const hasDevanagari = /[\u0900-\u097F]/.test(customSource);
    let targetLang = 'Hindi';
    let sourceLang = 'English';

    if (customDirection === 'en-to-mr') {
      sourceLang = 'English';
      targetLang = 'Marathi';
    } else if (customDirection === 'hi-to-mr') {
      sourceLang = 'Hindi';
      targetLang = 'Marathi';
    } else if (customDirection === 'mr-to-en') {
      sourceLang = 'Marathi';
      targetLang = 'English';
    } else if (customDirection === 'mr-to-hi') {
      sourceLang = 'Marathi';
      targetLang = 'Hindi';
    } else if (customDirection === 'hi-to-en' || (customDirection === 'auto' && hasDevanagari)) {
      sourceLang = 'Hindi';
      targetLang = 'English';
    } else {
      sourceLang = 'English';
      targetLang = 'Hindi';
    }

    try {
      const sourceParas = customSource.split('\n\n').filter(p => p.trim());
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphs: sourceParas,
          sourceLang,
          targetLang
        })
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.translatedParagraphs)) {
        setCustomTarget(data.translatedParagraphs.join('\n\n'));
      }
    } catch (err) {
      console.warn('Modal translation warning:', err);
    } finally {
      setIsModalTranslating(false);
    }
  };

  // Switch story
  const handleSelectStory = (text) => {
    setActiveStory(text);
    setActiveParagraphIndex(0);
    setInspectedWord(null);
    setInlinePopup(null);
    setAnalysisError(null);
  };

  // Swap reading direction for currently active story (Generic for any bilingual pair)
  const handleSwapStoryDirection = () => {
    if (!activeStory || !activeStory.paragraphs) return;
    const hasTargetText = activeStory.paragraphs.some(p => p.target && !p.target.includes('अनुवाद उपलब्ध') && !p.target.includes('Translating'));
    if (!hasTargetText) return;

    const oldSourceLang = activeStory.sourceLang;
    const oldSourceLangName = activeStory.sourceLangName;
    const oldTargetLang = activeStory.targetLang;
    const oldTargetLangName = activeStory.targetLangName;

    setActiveStory(prev => ({
      ...prev,
      sourceLang: oldTargetLang,
      sourceLangName: oldTargetLangName,
      targetLang: oldSourceLang,
      targetLangName: oldSourceLangName,
      paragraphs: prev.paragraphs.map(p => ({
        ...p,
        source: p.target,
        target: p.source
      }))
    }));
    setDetectedWords([]);
    setInspectedWord(null);
    setInlinePopup(null);
    setAnalysisError(null);
  };

  // Custom text handler
  const handleAddCustomText = (e) => {
    e.preventDefault();
    if (!customSource.trim()) return;

    const sourceParagraphs = customSource.split('\n\n').filter(p => p.trim());
    const targetParagraphs = customTarget.split('\n\n').filter(p => p.trim());
    const needsTranslation = targetParagraphs.length === 0 || !customTarget.trim();

    const hasDevanagari = /[\u0900-\u097F]/.test(customSource);
    
    let sourceLangCode = 'en';
    let sourceLangName = 'English';
    let targetLangCode = 'hi';
    let targetLangName = 'Hindi (हिन्दी)';
    let translateTarget = 'Hindi';

    if (customDirection === 'en-to-mr') {
      sourceLangCode = 'en';
      sourceLangName = 'English';
      targetLangCode = 'mr';
      targetLangName = 'Marathi (मराठी)';
      translateTarget = 'Marathi';
    } else if (customDirection === 'hi-to-mr') {
      sourceLangCode = 'hi';
      sourceLangName = 'Hindi (हिन्दी)';
      targetLangCode = 'mr';
      targetLangName = 'Marathi (मराठी)';
      translateTarget = 'Marathi';
    } else if (customDirection === 'mr-to-en') {
      sourceLangCode = 'mr';
      sourceLangName = 'Marathi (मराठी)';
      targetLangCode = 'en';
      targetLangName = 'English';
      translateTarget = 'English';
    } else if (customDirection === 'mr-to-hi') {
      sourceLangCode = 'mr';
      sourceLangName = 'Marathi (मराठी)';
      targetLangCode = 'hi';
      targetLangName = 'Hindi (हिन्दी)';
      translateTarget = 'Hindi';
    } else if (customDirection === 'hi-to-en' || (customDirection === 'auto' && hasDevanagari)) {
      sourceLangCode = 'hi';
      sourceLangName = 'Hindi (हिन्दी)';
      targetLangCode = 'en';
      targetLangName = 'English';
      translateTarget = 'English';
    } else {
      sourceLangCode = 'en';
      sourceLangName = 'English';
      targetLangCode = 'hi';
      targetLangName = 'Hindi (हिन्दी)';
      translateTarget = 'Hindi';
    }

    const placeholderText = `✨ Gemini AI ${targetLangName} अनुवाद तयार करत आहे (Translating to ${targetLangName}...)...`;

    const paragraphs = sourceParagraphs.map((sourceText, idx) => ({
      id: `custom-p-${idx + 1}`,
      source: sourceText.trim(),
      target: targetParagraphs[idx]?.trim() || (needsTranslation ? placeholderText : 'अनुवाद उपलब्ध नाही')
    }));

    const newText = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || `कस्टम पठन पाठ (${sourceLangName} ➔ ${targetLangName})`,
      category: 'User Import',
      level: `Level ${readerLevel}`,
      sourceLang: sourceLangCode,
      sourceLangName: sourceLangName,
      targetLang: targetLangCode,
      targetLangName: targetLangName,
      readTime: `${Math.max(1, Math.ceil(customSource.split(' ').length / 150))} min read`,
      paragraphs
    };

    setActiveStory(newText);
    setShowCustomModal(false);
    setCustomTitle('');
    setCustomSource('');
    setCustomTarget('');
    setActiveParagraphIndex(0);
    setInspectedWord(null);
    setInlinePopup(null);
    setAnalysisError(null);

    // If target translation was not provided, immediately fetch AI translation!
    if (needsTranslation) {
      triggerAutoTranslate(sourceParagraphs, newText.id, translateTarget);
    }
  };

  // Document & Photo file selector & validator (Images + PDFs)
  const handlePhotoFileSelect = (file) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoExtractedData(null);

    // Validate MIME type or file extension (PDF + Images)
    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const isImage = validImageTypes.includes((file.type || '').toLowerCase()) || Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp)$/i));
    const isPdf = (file.type || '').toLowerCase() === 'application/pdf' || Boolean(file.name && file.name.match(/\.pdf$/i));
    
    if (!isImage && !isPdf) {
      setPhotoError('Invalid file format. Please upload a PDF document or a JPG, JPEG, PNG image.');
      return;
    }

    // Validate size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('File size exceeds 15MB limit. Please upload a smaller document or photo.');
      return;
    }

    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);
  };

  // Remove photo or document
  const handleRemovePhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoExtractedData(null);
    setPhotoError(null);
  };

  // Analyze Document/Photo with Gemini Multimodal Vision & PDF extraction
  const handleAnalyzePhoto = async () => {
    if (!photoFile) {
      setPhotoError('Please choose or drop a PDF document or photo first.');
      return;
    }

    setIsPhotoAnalyzing(true);
    setPhotoError(null);

    const formData = new FormData();
    formData.append('image', photoFile);
    formData.append('level', photoLevel);
    formData.append('targetLanguage', photoTargetLang === 'auto' ? 'Hindi' : photoTargetLang);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract and analyze text from document/image.');
      }

      if (data.isReadable === false) {
        throw new Error(data.error || 'The document/image text could not be read clearly. Please upload a clearer PDF or sharper photo.');
      }

      setPhotoExtractedData(data);
    } catch (err) {
      console.error('[Paarth Frontend] Document analysis error:', err);
      setPhotoError(err.message || 'Error processing document/photo with Gemini.');
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  // Load Extracted Document/Photo Data into the Dual Reader
  const handleLoadPhotoIntoReader = () => {
    if (!photoExtractedData) return;

    const sourceParagraphs = photoExtractedData.extractedParagraphs || [];
    const targetParagraphs = photoExtractedData.translatedParagraphs || [];
    const isPdf = photoFile?.type === 'application/pdf' || photoFile?.name?.toLowerCase().endsWith('.pdf');

    const detectedSrcLang = photoExtractedData.sourceLanguage || '';
    const isMarathiSource = detectedSrcLang.toLowerCase().includes('marathi');
    const isHindiSource = detectedSrcLang.toLowerCase().includes('hindi') || (/[\u0900-\u097F]/.test(photoExtractedData.extractedText || '') && !isMarathiSource);

    let sourceLang = 'en';
    let sourceLangName = 'English';
    let targetLang = 'hi';
    let targetLangName = 'Hindi (हिन्दी)';

    if (photoTargetLang === 'Marathi') {
      targetLang = 'mr';
      targetLangName = 'Marathi (मराठी)';
      sourceLang = isHindiSource ? 'hi' : 'en';
      sourceLangName = isHindiSource ? 'Hindi (हिन्दी)' : 'English';
    } else if (photoTargetLang === 'Hindi') {
      targetLang = 'hi';
      targetLangName = 'Hindi (हिन्दी)';
      sourceLang = isMarathiSource ? 'mr' : 'en';
      sourceLangName = isMarathiSource ? 'Marathi (मराठी)' : 'English';
    } else if (photoTargetLang === 'English') {
      targetLang = 'en';
      targetLangName = 'English';
      sourceLang = isMarathiSource ? 'mr' : 'hi';
      sourceLangName = isMarathiSource ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)';
    } else {
      // Auto
      if (isMarathiSource) {
        sourceLang = 'mr';
        sourceLangName = 'Marathi (मराठी)';
        targetLang = 'en';
        targetLangName = 'English';
      } else if (isHindiSource) {
        sourceLang = 'hi';
        sourceLangName = 'Hindi (हिन्दी)';
        targetLang = 'en';
        targetLangName = 'English';
      } else {
        sourceLang = 'en';
        sourceLangName = 'English';
        targetLang = 'hi';
        targetLangName = 'Hindi (हिन्दी)';
      }
    }

    const newPhotoStory = {
      id: `doc-${Date.now()}`,
      title: photoExtractedData.title || (photoFile ? photoFile.name.replace(/\.[^/.]+$/, '') : (isPdf ? 'PDF Document' : 'Photo Document')),
      originalTitle: isPdf 
        ? `Extracted from PDF: ${photoFile?.name || 'Document'}` 
        : `Scanned with Gemini Vision (${photoFile?.name || 'Uploaded Photo'})`,
      category: isPdf ? 'PDF Document Reader' : 'Photo Reader',
      level: `Level ${photoLevel}`,
      sourceLang,
      sourceLangName,
      targetLang,
      targetLangName,
      isPdf,
      fileName: photoFile?.name,
      readTime: `${Math.max(1, Math.ceil((photoExtractedData.extractedText || '').split(' ').length / 150))} min read`,
      photoUrl: isPdf ? null : photoPreviewUrl,
      paragraphs: sourceParagraphs.map((src, idx) => ({
        id: `doc-p-${idx + 1}`,
        source: src,
        target: targetParagraphs[idx] || (targetLang === 'en' ? 'English translation pending' : 'अनुवाद उपलब्ध नाही')
      }))
    };

    // Add to photo stories list
    setPhotoStories(prev => [newPhotoStory, ...prev]);
    setActiveStory(newPhotoStory);

    // Set detected words from Vision/Doc extraction
    const words = photoExtractedData.detectedWords || [];
    setDetectedWords(words);
    const cacheKey = `${newPhotoStory.id}_lvl${photoLevel}`;
    setAnalysisCache(prev => ({
      ...prev,
      [cacheKey]: words
    }));

    // Auto-inspect first word if present
    if (words.length > 0) {
      setInspectedWord({
        ...words[0],
        isAiDetected: true,
        level: photoLevel,
        sourceLang: newPhotoStory.sourceLang,
        targetLang: newPhotoStory.targetLang
      });
    } else {
      setInspectedWord(null);
    }

    setActiveParagraphIndex(0);
    setInlinePopup(null);
    setAnalysisError(null);
    setShowPhotoModal(false);
  };

  // Helper to tokenize fallback non-highlighted segments
  const tokenizeText = (text) => {
    return text.match(/[\w\u0900-\u097F'-]+|[^\w\s\u0900-\u097F]+|\s+/g) || [];
  };

  // Word Click Handler for unhighlighted words
  const handleWordClick = (rawWord, paragraphText, paragraphIndex, e) => {
    const cleaned = rawWord.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
    if (!cleaned) return;

    setActiveParagraphIndex(paragraphIndex);

    // Check if it matches an AI detected term
    const aiMatch = detectedWords.find(dw => dw.term.toLowerCase() === cleaned);
    if (aiMatch) {
      handleSelectDetectedWord(aiMatch, paragraphText, paragraphIndex, e);
      return;
    }

    // Check pre-populated dictionary
    if (DICTIONARY_DATABASE[cleaned]) {
      const entry = DICTIONARY_DATABASE[cleaned];
      const wordObj = {
        term: entry.word,
        word: entry.word,
        phonetic: entry.phonetic,
        partOfSpeech: entry.partOfSpeech,
        category: 'Vocabulary',
        englishMeaning: entry.definition,
        hindiMeaning: entry.translation,
        example: entry.example,
        explanation: entry.explanation,
        contextSentence: paragraphText,
        sourceLang: activeStory.sourceLang,
        targetLang: activeStory.targetLang,
        isAiDetected: false
      };
      setInspectedWord(wordObj);
      showQuickPopup(wordObj, e);
      return;
    }

    // Dynamic mock context for any other clicked word
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    const mockWord = {
      term: capitalized,
      word: capitalized,
      phonetic: `/${cleaned}/`,
      partOfSpeech: cleaned.endsWith('ing') ? 'Verb (Continuous)' : cleaned.endsWith('ed') ? 'Past Verb' : cleaned.endsWith('ly') ? 'Adverb' : 'Noun / Term',
      category: 'Contextual Word',
      englishMeaning: `Contextual meaning of "${capitalized}" within this passage.`,
      hindiMeaning: `[${capitalized} का हिन्दी अर्थ]`,
      example: paragraphText,
      explanation: `Analyzed in current reading context.`,
      contextSentence: paragraphText,
      sourceLang: activeStory.sourceLang,
      targetLang: activeStory.targetLang,
      isAiDetected: false
    };

    setInspectedWord(mockWord);
    showQuickPopup(mockWord, e);
  };

  // Click on an AI-detected highlighted word/phrase
  const handleSelectDetectedWord = (detectedItem, paragraphText, paragraphIndex, e) => {
    setActiveParagraphIndex(paragraphIndex);
    const wordObj = {
      ...detectedItem,
      word: detectedItem.term,
      isAiDetected: true,
      level: readerLevel,
      contextSentence: detectedItem.contextSentence || paragraphText,
      sourceLang: activeStory.sourceLang,
      targetLang: activeStory.targetLang
    };
    setInspectedWord(wordObj);
    showQuickPopup(wordObj, e);
  };

  // Show inline floating popup near click
  const showQuickPopup = (wordObj, e) => {
    if (!e || !e.clientX) return;
    const rect = e.currentTarget ? e.currentTarget.getBoundingClientRect() : null;
    const x = rect ? Math.min(window.innerWidth - 320, Math.max(16, rect.left)) : e.clientX;
    const y = rect ? rect.bottom + window.scrollY + 8 : e.clientY + window.scrollY;
    setInlinePopup({
      word: wordObj,
      x,
      y
    });
  };

  // High-fidelity speech pronunciation (Supports English, Hindi & Marathi with natural voice fallbacks)
  const playSpeech = (text, lang, elementId = null) => {
    if (!text) return;
    if (elementId && speakingId === elementId) {
      stopSpeech();
      setSpeakingId(null);
      return;
    }

    if (elementId) setSpeakingId(elementId);

    const isDevanagari = /[\u0900-\u097F]/.test(text);
    const effectiveLang = lang || (isDevanagari 
      ? (activeStory?.sourceLang === 'mr' ? 'mr-IN' : 'hi-IN') 
      : (activeStory?.sourceLang === 'mr' ? 'mr-IN' : (activeStory?.sourceLang === 'hi' ? 'hi-IN' : 'en-US')));

    playAudibleSpeech(text, {
      lang: effectiveLang,
      rate: isDevanagari ? 0.92 : 0.96,
      volume: 1.0,
      pitch: 1.0,
      onStart: () => {
        if (elementId) setSpeakingId(elementId);
      },
      onEnd: () => {
        setSpeakingId(null);
      },
      onError: () => {
        setSpeakingId(null);
      }
    });
  };

  // Check if current inspected word is already saved in vocabulary
  const isWordSaved = inspectedWord 
    ? savedWords.some(w => w.word.toLowerCase() === (inspectedWord.term || inspectedWord.word).toLowerCase())
    : false;

  // Save to My Words
  const handleSaveCurrentWord = () => {
    if (!inspectedWord) return;
    const wordTerm = inspectedWord.term || inspectedWord.word;
    const isHindiWord = /[\u0900-\u097F]/.test(wordTerm);

    onSaveWord({
      id: `w-${Date.now()}`,
      word: wordTerm,
      phonetic: inspectedWord.phonetic || `/${wordTerm.toLowerCase()}/`,
      partOfSpeech: inspectedWord.partOfSpeech || 'Term',
      translation: isHindiWord 
        ? (inspectedWord.englishMeaning || inspectedWord.translation || 'English Meaning')
        : (inspectedWord.hindiMeaning || inspectedWord.translation || 'अनुवाद'),
      language: isHindiWord ? 'English' : 'Hindi',
      sourceLang: isHindiWord ? 'hi' : 'en',
      targetLang: isHindiWord ? 'en' : 'hi',
      definition: isHindiWord
        ? (inspectedWord.hindiMeaning || inspectedWord.definition || 'हिन्दी व्याख्या')
        : (inspectedWord.englishMeaning || inspectedWord.definition || 'Contextual meaning.'),
      contextSentence: inspectedWord.contextSentence || inspectedWord.example || '',
      contextTranslation: inspectedWord.example || '',
      status: 'Learning',
      notes: inspectedWord.category ? `Category: ${inspectedWord.category} (Level ${readerLevel})` : 'Saved from AI Reader.',
      tags: [activeStory.category || 'Reading', `Level ${readerLevel}`, inspectedWord.category || 'Vocabulary'],
      dateAdded: new Date().toISOString().split('T')[0],
      reviewCount: 0
    });
  };

  // Intelligent Paragraph Renderer that highlights AI detected words and multi-word phrases
  const renderParagraphWithHighlights = (paragraphText, paragraphIndex) => {
    if (!detectedWords || detectedWords.length === 0) {
      // Normal tokenized view when no AI analysis active
      return tokenizeText(paragraphText).map((token, tIdx) => {
        const isWord = /[\w\u0900-\u097F]/.test(token);
        const isActiveWord = inspectedWord && (inspectedWord.term || inspectedWord.word).toLowerCase() === token.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');

        if (!isWord) return <span key={tIdx}>{token}</span>;

        return (
          <span
            key={tIdx}
            onClick={(e) => {
              e.stopPropagation();
              handleWordClick(token, paragraphText, paragraphIndex, e);
            }}
            className={`clickable-word ${
              isActiveWord ? 'active-word bg-brand-100 text-brand-800 font-semibold' : ''
            }`}
          >
            {token}
          </span>
        );
      });
    }

    // Build regex to match any of the detected terms (sorted by length descending for longest match)
    const sortedTerms = [...detectedWords]
      .filter(item => item.term && item.term.trim())
      .sort((a, b) => b.term.length - a.term.length);

    // Find all occurrences with start and end indices
    const matches = [];
    sortedTerms.forEach(item => {
      const termStr = item.term.trim();
      const escaped = termStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word boundary match
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let m;
      while ((m = regex.exec(paragraphText)) !== null) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          matchedText: m[0],
          data: item
        });
      }
    });

    // Sort matches by start index
    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    // Filter out overlapping matches
    const nonOverlapping = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        nonOverlapping.push(match);
        lastEnd = match.end;
      }
    }

    // If no matches in this paragraph, fallback to standard tokenizing
    if (nonOverlapping.length === 0) {
      return tokenizeText(paragraphText).map((token, tIdx) => {
        const isWord = /[\w\u0900-\u097F]/.test(token);
        if (!isWord) return <span key={tIdx}>{token}</span>;
        return (
          <span
            key={tIdx}
            onClick={(e) => {
              e.stopPropagation();
              handleWordClick(token, paragraphText, paragraphIndex, e);
            }}
            className="clickable-word"
          >
            {token}
          </span>
        );
      });
    }

    // Split text into non-overlapping segments
    const elements = [];
    let currentIndex = 0;

    nonOverlapping.forEach((match, idx) => {
      // Preceding plain text
      if (match.start > currentIndex) {
        const plainSegment = paragraphText.substring(currentIndex, match.start);
        elements.push(
          <span key={`plain-${currentIndex}`}>
            {tokenizeText(plainSegment).map((t, tidx) => {
              const isWord = /[\w\u0900-\u097F]/.test(t);
              if (!isWord) return <span key={tidx}>{t}</span>;
              return (
                <span
                  key={tidx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWordClick(t, paragraphText, paragraphIndex, e);
                  }}
                  className="clickable-word"
                >
                  {t}
                </span>
              );
            })}
          </span>
        );
      }

      // Highlighted AI Term
      const isSelected = inspectedWord && 
        (inspectedWord.term || inspectedWord.word).toLowerCase() === match.data.term.toLowerCase();

      elements.push(
        <mark
          key={`highlight-${match.start}`}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectDetectedWord(match.data, paragraphText, paragraphIndex, e);
          }}
          className={`cursor-pointer inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold transition-all duration-150 ${
            isSelected
              ? 'bg-amber-300 text-amber-950 ring-2 ring-brand-500 shadow-sm'
              : 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-900 border-b-2 border-amber-400 hover:border-amber-500'
          }`}
          title={`AI Detected (${match.data.category || 'Vocabulary'}) — Tap for meaning`}
        >
          <span>{match.matchedText}</span>
          <span className="text-[9px] font-bold text-amber-700 bg-amber-200/70 px-1 rounded -my-0.5 ml-0.5 opacity-80">
            AI
          </span>
        </mark>
      );

      currentIndex = match.end;
    });

    // Trailing plain text
    if (currentIndex < paragraphText.length) {
      const remaining = paragraphText.substring(currentIndex);
      elements.push(
        <span key={`plain-${currentIndex}`}>
          {tokenizeText(remaining).map((t, tidx) => {
            const isWord = /[\w\u0900-\u097F]/.test(t);
            if (!isWord) return <span key={tidx}>{t}</span>;
            return (
              <span
                key={tidx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordClick(t, paragraphText, paragraphIndex, e);
                }}
                className="clickable-word"
              >
                {t}
              </span>
            );
          })}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Reading Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        
        {/* Top Row: Story Selection & AI Level Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Story Selector Dropdown & Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span>Story:</span>
            </span>

            {SAMPLE_TEXTS.map((story) => (
              <button
                key={story.id}
                onClick={() => handleSelectStory(story)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeStory.id === story.id
                    ? 'bg-brand-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                {story.title}
              </button>
            ))}

            {photoStories.map((story) => (
              <button
                key={story.id}
                onClick={() => handleSelectStory(story)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  activeStory.id === story.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {story.isPdf ? (
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{story.title}</span>
              </button>
            ))}

            <button
              onClick={() => setShowCustomModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-brand-300 text-brand-700 bg-brand-50/50 hover:bg-brand-50 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Paste Custom</span>
            </button>

            <button
              onClick={() => {
                setShowPhotoModal(true);
                setPhotoError(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all hover:shadow-md active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Upload PDF / Image</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                AI OCR
              </span>
            </button>
          </div>

          {/* AI Reader Level & Analyze Button */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
            
            {/* Level Selector */}
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-brand-600 ml-1" />
              <span className="text-xs font-semibold text-slate-700">Reader Level:</span>
              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs">
                <button
                  onClick={() => setReaderLevel(1)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    readerLevel === 1
                      ? 'bg-white text-brand-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Level 1: Beginner (Highlights generous vocabulary and idioms)"
                >
                  Level 1 <span className="text-[10px] font-normal hidden sm:inline">(Learner)</span>
                </button>
                <button
                  onClick={() => setReaderLevel(2)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    readerLevel === 2
                      ? 'bg-white text-brand-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Level 2: Intermediate (Highlights literary and advanced terms)"
                >
                  Level 2 <span className="text-[10px] font-normal hidden sm:inline">(Intermediate)</span>
                </button>
                <button
                  onClick={() => setReaderLevel(3)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    readerLevel === 3
                      ? 'bg-white text-brand-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Level 3: Advanced (Highlights strictly technical jargon)"
                >
                  Level 3 <span className="text-[10px] font-normal hidden sm:inline">(Jargon)</span>
                </button>
              </div>
            </div>

            {/* Analyze with AI Button */}
            <button
              onClick={() => handleAnalyzeArticle(readerLevel)}
              disabled={isAnalyzing}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] ${
                isAnalyzing
                  ? 'bg-brand-100 text-brand-600 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Bottom Row: View Layout & Typography Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Analysis Status Pill */}
          <div className="flex items-center gap-2 text-xs">
            {detectedWords.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>AI Detected {detectedWords.length} terms (Level {readerLevel})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200/70">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Select Level and click "Analyze with AI" to detect difficult terms</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Reading Layout Modes */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70 text-xs">
              <button
                onClick={() => setReadingMode('split')}
                title="Side-by-side Dual Column View"
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  readingMode === 'split' ? 'bg-white text-brand-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split View</span>
              </button>
              <button
                onClick={() => setReadingMode('stacked')}
                title="Sentence-by-Sentence Interlinear View"
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  readingMode === 'stacked' ? 'bg-white text-brand-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Interlinear</span>
              </button>
              <button
                onClick={() => setReadingMode('sourceOnly')}
                title="Focus View (Hide Target)"
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  readingMode === 'sourceOnly' ? 'bg-white text-brand-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </button>
            </div>

            {/* Font Controls */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/70 text-xs">
              <Type className="w-3.5 h-3.5 text-slate-500 mr-1" />
              <button
                onClick={() => setFontSize('text-base')}
                className={`px-2 py-0.5 rounded ${fontSize === 'text-base' ? 'bg-white font-bold text-brand-700 shadow-2xs' : 'text-slate-600'}`}
                title="Normal Font Size"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('text-lg')}
                className={`px-2 py-0.5 rounded ${fontSize === 'text-lg' ? 'bg-white font-bold text-brand-700 shadow-2xs' : 'text-slate-600'}`}
                title="Medium Font Size"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('text-xl')}
                className={`px-2 py-0.5 rounded ${fontSize === 'text-xl' ? 'bg-white font-bold text-brand-700 shadow-2xs' : 'text-slate-600'}`}
                title="Large Font Size"
              >
                A++
              </button>
              <span className="text-slate-300 mx-1">|</span>
              <button
                onClick={() => setFontFamily(fontFamily === 'font-serif' ? 'font-sans' : 'font-serif')}
                className="text-[11px] font-semibold text-slate-600 hover:text-brand-600 px-1"
                title="Toggle Serif / Sans font"
              >
                {fontFamily === 'font-serif' ? 'Serif' : 'Sans'}
              </button>
            </div>

            {/* AI Tutor Toggle Button */}
            <button
              type="button"
              onClick={() => setShowTutorDrawer(!showTutorDrawer)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                showTutorDrawer
                  ? 'bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-300'
                  : 'bg-gradient-to-r from-brand-50 to-indigo-50 hover:from-brand-100 hover:to-indigo-100 text-brand-700 border border-brand-200'
              }`}
              title="Open Paarth AI Reading Tutor"
            >
              <Bot className="w-3.5 h-3.5 text-brand-600" />
              <span>Ask AI Tutor</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-brand-600 text-white">
                Chat
              </span>
            </button>
          </div>

        </div>

      </div>

      {/* Error / Key Banner if applicable */}
      {analysisError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900 flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950">AI Analysis Notice:</p>
              <p className="leading-relaxed">{analysisError}</p>
              {analysisError.includes('GEMINI_API_KEY') && (
                <p className="text-[11px] text-rose-800 bg-rose-100/70 p-2 rounded-lg font-mono">
                  Tip: Open <code>backend/.env</code> and replace <code>YOUR_GEMINI_API_KEY_HERE</code> with your Google Gemini API key.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setAnalysisError(null)}
            className="p-1 rounded text-rose-500 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Banner */}
      {isAnalyzing && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-sky-50 to-brand-50 p-4 text-xs text-brand-900 flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            <div>
              <p className="font-bold text-brand-950">
                Scanning article with Gemini AI for Level {readerLevel} vocabulary & idioms...
              </p>
              <p className="text-slate-500">
                {readerLevel === 1 && 'Level 1: Detecting generous vocabulary words and idiomatic expressions.'}
                {readerLevel === 2 && 'Level 2: Detecting intermediate-to-advanced literary and contextual words.'}
                {readerLevel === 3 && 'Level 3: Filtering strictly for specialized and technical jargon.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Reading Canvas & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Reading Content Column */}
        <div className={`space-y-4 ${inspectedWord ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          
          {/* Article Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  {activeStory.category}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Level {readerLevel} Reading
                </span>
                {detectedWords.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>{detectedWords.length} AI Terms Highlighted</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                <span>{activeStory.readTime}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleSwapStoryDirection}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 transition-colors group"
                  title="Click to swap Reading and Translation columns"
                >
                  <Globe className="w-3.5 h-3.5 text-brand-600" />
                  <span>{activeStory.sourceLangName}</span>
                  <span className="text-slate-400 group-hover:text-brand-600 font-bold">⇄</span>
                  <span>{activeStory.targetLangName}</span>
                  <span className="text-[10px] text-brand-600 bg-white px-1 rounded border border-brand-200 ml-0.5">Swap</span>
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeStory.title}
            </h1>
            {activeStory.originalTitle && (
              <p className="text-sm font-medium text-slate-500 mt-1">
                Original: <span className="italic">{activeStory.originalTitle}</span>
              </p>
            )}

            {activeStory.photoUrl && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => setViewingOriginalPhoto(activeStory.photoUrl)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>View Original Scanned Photo</span>
                </button>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  OCR extracted & bilingual aligned with Gemini Vision
                </span>
              </div>
            )}

            {/* Quick helper tip */}
            <div className="mt-4 p-3 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center justify-between gap-2.5 text-xs text-brand-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  <strong>Tip:</strong> Click on <span className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-semibold">highlighted AI terms</span> or <em>any word</em> in the article to view the complete Hindi & English explanation popup!
                </span>
              </div>
              {detectedWords.length === 0 && !isAnalyzing && (
                <button
                  onClick={() => handleAnalyzeArticle(readerLevel)}
                  className="shrink-0 px-2.5 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px] shadow-2xs"
                >
                  Detect Words Now
                </button>
              )}
            </div>
          </div>

          {/* Paragraphs Canvas */}
          <div className="space-y-4">
            {activeStory.paragraphs.map((para, pIndex) => {
              const isSelectedPara = activeParagraphIndex === pIndex;

              return (
                <div
                  key={para.id || pIndex}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-6 shadow-xs ${
                    isSelectedPara 
                      ? 'border-brand-400 ring-2 ring-brand-100 shadow-soft' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveParagraphIndex(pIndex)}
                >
                  {/* Paragraph Header with Audio */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-400">
                    <span className="font-semibold text-slate-500">
                      Paragraph {pIndex + 1} of {activeStory.paragraphs.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSpeech(
                          para.source, 
                          activeStory.sourceLang === 'mr' ? 'mr-IN' : (activeStory.sourceLang === 'hi' ? 'hi-IN' : 'en-US'),
                          `para-${pIndex}`
                        );
                      }}
                      className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                        speakingId === `para-${pIndex}` 
                          ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300 shadow-2xs' 
                          : 'hover:bg-slate-100 text-slate-600 hover:text-brand-600'
                      }`}
                      title={speakingId === `para-${pIndex}` ? 'Click to stop reading' : 'Listen to full paragraph'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${speakingId === `para-${pIndex}` ? 'text-brand-600 animate-pulse' : 'text-brand-600'}`} />
                      <span>{speakingId === `para-${pIndex}` ? 'Speaking...' : 'Read aloud'}</span>
                    </button>
                  </div>

                  {/* Mode 1: Split View (Side by Side) */}
                  {readingMode === 'split' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Source text with interactive words */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700 mb-1 flex items-center justify-between">
                          <span>{activeStory.sourceLangName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Click words for popup</span>
                        </div>
                        <p className={`${fontSize} ${fontFamily} leading-relaxed text-slate-800`}>
                          {renderParagraphWithHighlights(para.source, pIndex)}
                        </p>
                      </div>

                      {/* Right: Target Translation */}
                      <div className="space-y-1 md:border-l md:border-slate-100 md:pl-6">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          {activeStory.targetLangName}
                        </div>
                        <div className={`${fontSize} font-hindi leading-relaxed text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100`}>
                          {para.target?.includes('तैयार कर रहा') || para.target?.includes('Translating') ? (
                            <div className="flex items-center gap-2 text-brand-700 text-sm font-sans animate-pulse py-1">
                              <Loader2 className="w-4 h-4 animate-spin text-brand-600 shrink-0" />
                              <span>{para.target}</span>
                            </div>
                          ) : (
                            <p>{para.target}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Interlinear / Stacked View */}
                  {readingMode === 'stacked' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700 mb-1">
                          {activeStory.sourceLangName}
                        </div>
                        <p className={`${fontSize} ${fontFamily} leading-relaxed text-slate-800`}>
                          {renderParagraphWithHighlights(para.source, pIndex)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          {activeStory.targetLangName} (Aligned Translation)
                        </div>
                        <div className={`${fontSize} font-hindi leading-relaxed text-slate-700 bg-brand-50/30 p-3 rounded-xl border border-brand-100/60`}>
                          {para.target?.includes('तैयार कर रहा') || para.target?.includes('Translating') ? (
                            <div className="flex items-center gap-2 text-brand-700 text-sm font-sans animate-pulse py-1">
                              <Loader2 className="w-4 h-4 animate-spin text-brand-600 shrink-0" />
                              <span>{para.target}</span>
                            </div>
                          ) : (
                            <p>{para.target}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Source Only Focus View */}
                  {readingMode === 'sourceOnly' && (
                    <div className="space-y-3">
                      <p className={`${fontSize} ${fontFamily} leading-relaxed text-slate-800`}>
                        {renderParagraphWithHighlights(para.source, pIndex)}
                      </p>

                      {/* Reveal translation button on demand */}
                      <details className="text-xs text-slate-500 pt-2 border-t border-slate-100 group">
                        <summary className="cursor-pointer font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 select-none">
                          <span>Reveal {activeStory.targetLangName} translation</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg font-hindi">
                          {para.target?.includes('तैयार कर रहा') || para.target?.includes('Translating') ? (
                            <div className="flex items-center gap-2 text-brand-700 text-sm font-sans animate-pulse">
                              <Loader2 className="w-4 h-4 animate-spin text-brand-600 shrink-0" />
                              <span>{para.target}</span>
                            </div>
                          ) : (
                            <p>{para.target}</p>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* Word Inspector Side Panel (Sticky on Desktop) */}
        {inspectedWord && (
          <div className="lg:col-span-4 sticky top-20">
            <div className="bg-white rounded-2xl border border-brand-200/90 shadow-elevated overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
              
              {/* Card Header */}
              <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-sky-700 text-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{inspectedWord.isAiDetected ? `Gemini AI • Level ${inspectedWord.level || readerLevel}` : 'Word Companion'}</span>
                  </span>
                  <button
                    onClick={() => { setInspectedWord(null); setInlinePopup(null); }}
                    className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
                    aria-label="Close inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {inspectedWord.term || inspectedWord.word}
                    </h3>
                    {inspectedWord.phonetic && (
                      <p className="text-xs text-brand-100 font-mono mt-0.5">{inspectedWord.phonetic}</p>
                    )}
                  </div>
                  <button
                    onClick={() => playSpeech(
                      inspectedWord.term || inspectedWord.word, 
                      inspectedWord.sourceLang === 'mr' ? 'mr-IN' : (inspectedWord.sourceLang === 'hi' ? 'hi-IN' : 'en-US'),
                      'inspected-word'
                    )}
                    className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                      speakingId === 'inspected-word' 
                        ? 'bg-white text-brand-700 shadow-md ring-2 ring-white/50' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={speakingId === 'inspected-word' ? 'Click to stop pronunciation' : 'Play pronunciation'}
                  >
                    <Volume2 className={`w-4 h-4 ${speakingId === 'inspected-word' ? 'animate-pulse' : ''}`} />
                    <span>{speakingId === 'inspected-word' ? 'Playing...' : 'Audio'}</span>
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {inspectedWord.category && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/15 text-white">
                      {inspectedWord.category}
                    </span>
                  )}
                  {inspectedWord.partOfSpeech && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/10 text-brand-100">
                      {inspectedWord.partOfSpeech}
                    </span>
                  )}
                </div>
              </div>

              {/* Inspector Content */}
              <div className="p-5 space-y-4 text-sm">
                
                {/* Functional Hindi Explanation */}
                <div className="p-3.5 bg-gradient-to-br from-brand-50 to-sky-50 rounded-xl border border-brand-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1">
                      <span>हिन्दी अर्थ (Hindi Meaning)</span>
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-100 text-brand-800">
                      Functional
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 font-hindi leading-snug">
                    {inspectedWord.hindiMeaning || inspectedWord.translation || 'अनुवाद उपलब्ध नहीं'}
                  </p>
                </div>

                {/* Functional English Meaning */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    English Meaning
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {inspectedWord.englishMeaning || inspectedWord.definition}
                  </p>
                </div>

                {/* Illustrative Example */}
                {inspectedWord.example && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                    <span className="font-bold text-slate-600 block">Illustrative Example:</span>
                    <p className="italic text-slate-700 leading-relaxed font-serif">
                      "{inspectedWord.example}"
                    </p>
                  </div>
                )}

                {/* Context Sentence in Story */}
                {inspectedWord.contextSentence && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs space-y-1">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Context In This Article:</span>
                    </span>
                    <p className="text-amber-950 italic font-serif leading-relaxed">
                      "{inspectedWord.contextSentence}"
                    </p>
                  </div>
                )}

                {/* Save Word CTA Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveCurrentWord}
                    disabled={isWordSaved}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isWordSaved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/20 active:scale-[0.98]'
                    }`}
                  >
                    {isWordSaved ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                        <span>Saved in "My Words"</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Save to My Words Bank</span>
                      </>
                    )}
                  </button>

                  {isWordSaved && (
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Ready for practice in{' '}
                      <button 
                        onClick={() => { setActivePage('words'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-brand-600 font-semibold underline hover:text-brand-700"
                      >
                        Flashcard Mode
                      </button>
                    </p>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Floating Meaning Popup (Appears on click for quick mobile / inline reference) */}
      {inlinePopup && (
        <div 
          style={{ top: `${inlinePopup.y}px`, left: `${inlinePopup.x}px` }}
          className="fixed z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-elevated border border-brand-200 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-base font-bold text-slate-900">
                  {inlinePopup.word.term || inlinePopup.word.word}
                </h4>
                {inlinePopup.word.phonetic && (
                  <span className="text-[11px] font-mono text-slate-500">{inlinePopup.word.phonetic}</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                {inlinePopup.word.category || 'Vocabulary'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => playSpeech(inlinePopup.word.term || inlinePopup.word.word)}
                className="p-1 rounded text-slate-400 hover:text-brand-600"
                title="Pronounce"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInlinePopup(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-brand-50/70 p-2.5 rounded-xl border border-brand-100">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block mb-0.5">
              Hindi Meaning
            </span>
            <p className="text-base font-bold text-slate-900 font-hindi">
              {inlinePopup.word.hindiMeaning || inlinePopup.word.translation}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              English Meaning
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {inlinePopup.word.englishMeaning || inlinePopup.word.definition}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => {
                setInspectedWord(inlinePopup.word);
                setInlinePopup(null);
              }}
              className="text-brand-600 font-semibold hover:underline"
            >
              Full Details →
            </button>
            <button
              onClick={() => {
                handleSaveCurrentWord();
                setInlinePopup(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-2xs"
            >
              Save Word
            </button>
          </div>
        </div>
      )}

      {/* Paste Custom Text Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Paste Your Own Text to Read & Analyze</h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Translation Direction Selector */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-600" />
                  <span>Translation Direction:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {customDirection.startsWith('en') && 'Source: English'}
                  {customDirection.startsWith('hi') && 'Source: Hindi (हिन्दी)'}
                  {customDirection.startsWith('mr') && 'Source: Marathi (मराठी)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-semibold">
                {[
                  { id: 'en-to-hi', label: 'English ➔ Hindi' },
                  { id: 'hi-to-en', label: 'Hindi ➔ English' },
                  { id: 'en-to-mr', label: 'English ➔ Marathi' },
                  { id: 'hi-to-mr', label: 'Hindi ➔ Marathi' },
                  { id: 'mr-to-en', label: 'Marathi ➔ English' },
                  { id: 'mr-to-hi', label: 'Marathi ➔ Hindi' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCustomDirection(item.id)}
                    className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                      customDirection === item.id
                        ? 'bg-brand-600 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddCustomText} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document / Article Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Favorite Essay or News Article"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Source Text ({customDirection.startsWith('mr') ? 'Marathi / मराठी' : (customDirection.startsWith('hi') ? 'Hindi / हिन्दी' : 'English')}) *
                  </label>
                  {/[\u0900-\u097F]/.test(customSource) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Devanagari script detected
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder={customDirection.startsWith('mr') 
                    ? "येथे तुमचा मराठी मजकूर पेस्ट करा (परिच्छेद वेगळे करण्यासाठी एक रिकामी ओळ सोडा)..."
                    : (customDirection.startsWith('hi') 
                        ? "यहाँ अपना हिन्दी पाठ पेस्ट करें (पैराग्राफ अलग करने के लिए खाली लाइन छोड़ें)..."
                        : "Paste English reading text here (Separate paragraphs by blank line)...")}
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-hindi"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 text-xs sm:text-sm">
                    Aligned Translation ({customDirection.endsWith('mr') ? 'Marathi / मराठी' : (customDirection.endsWith('en') ? 'English' : 'Hindi / हिन्दी')}) (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleModalAutoTranslate}
                    disabled={isModalTranslating || !customSource.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md transition-colors"
                  >
                    {isModalTranslating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
                        <span>Translating with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                        <span>
                          {customDirection.endsWith('mr') && '✨ Translate to Marathi with AI'}
                          {customDirection.endsWith('en') && '✨ Translate to English with AI'}
                          {customDirection.endsWith('hi') && '✨ Translate to Hindi with AI'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Paste translation, click 'Auto-Translate with AI', or leave blank for automatic translation..."
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-hindi"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-600 shrink-0" />
                  <span>
                    If left blank, Paarth will automatically use Gemini AI to generate the translation when loaded!
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-xs"
                >
                  Load Into Reader
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* AI Document & Photo Reader Modal (PDF & Images) */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">AI Document & Photo Reader</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      PDF & Vision OCR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extract text from PDF documents, book pages, research papers or photos with bilingual AI analysis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setPhotoError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reader Level Selector for Photo/Doc */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Vocabulary Reader Level:</span>
                  <p className="text-[11px] text-slate-500">
                    {photoLevel === 1 && 'Level 1: Generous vocabulary highlighting for learners'}
                    {photoLevel === 2 && 'Level 2: Intermediate literary & contextual vocabulary'}
                    {photoLevel === 3 && 'Level 3: Technical & specialized jargon only'}
                  </p>
                </div>
              </div>
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setPhotoLevel(1)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    photoLevel === 1 ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Level 1
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoLevel(2)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    photoLevel === 2 ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Level 2
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoLevel(3)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    photoLevel === 3 ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Level 3
                </button>
              </div>
            </div>

            {/* Target Language Selector for Doc & Photo */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Target Translation Language:</span>
                  <p className="text-[11px] text-slate-500">
                    Translate extracted text into Hindi, Marathi, or English.
                  </p>
                </div>
              </div>
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setPhotoTargetLang('auto')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoTargetLang === 'auto' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Auto ⇄
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTargetLang('Hindi')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoTargetLang === 'Hindi' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  To Hindi (हिन्दी)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTargetLang('Marathi')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoTargetLang === 'Marathi' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  To Marathi (मराठी)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTargetLang('English')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoTargetLang === 'English' ? 'bg-white text-brand-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  To English
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone (when no file selected) */}
            {!photoFile && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handlePhotoFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
                onClick={() => document.getElementById('paarth-photo-input')?.click()}
              >
                <input
                  id="paarth-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-3 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Click to upload, or drag and drop PDF document or image here
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports <strong className="text-slate-700">PDF Documents, JPG, JPEG, and PNG</strong> (up to 15MB).
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Documents and photos are processed in-memory by Gemini Multimodal AI and are never permanently stored.
                </p>
              </div>
            )}

            {/* Preview & Action Controls (when file selected) */}
            {photoFile && (
              <div className="space-y-4">
                {/* PDF Document Preview Card */}
                {(photoFile.type === 'application/pdf' || photoFile.name.toLowerCase().endsWith('.pdf')) ? (
                  <div className="relative rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 to-red-50/40 p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
                      <FileText className="w-9 h-9" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 truncate max-w-md">
                        {photoFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        PDF Document • {(photoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI extraction
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>PDF Document Loaded & Ready</span>
                    </div>
                  </div>
                ) : (
                  /* Image Preview */
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900/5 p-3 flex flex-col items-center">
                    <img
                      src={photoPreviewUrl}
                      alt="Uploaded photo preview"
                      className="max-h-64 w-auto object-contain rounded-xl shadow-xs"
                    />
                    
                    {/* File Metadata Pill */}
                    <div className="mt-3 flex flex-wrap items-center justify-between w-full text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{photoFile.name}</span>
                        <span className="text-[11px] text-slate-400">
                          ({(photoFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {photoFile.type.split('/')[1] || 'IMAGE'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Remove & Analyse Buttons */}
                {!photoExtractedData && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isPhotoAnalyzing}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove File</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAnalyzePhoto}
                      disabled={isPhotoAnalyzing}
                      className="flex-1 py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      {isPhotoAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini Multimodal AI Extracting & Translating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyse Document with Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Loading Indicator with Progress */}
            {isPhotoAnalyzing && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 via-sky-50 to-brand-50 border border-brand-200 text-xs text-brand-900 space-y-1.5 animate-pulse">
                <div className="flex items-center gap-2 font-bold text-brand-950">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span>Processing Document/Photo with Google Gemini Multimodal AI...</span>
                </div>
                <p className="text-slate-600 text-[11px] pl-6">
                  Extracting verbatim text from PDF/image, preserving headings & paragraphs, translating, and detecting Level {photoLevel} vocabulary.
                </p>
              </div>
            )}

            {/* Error Message Display (Blurry / unreadable / network errors) */}
            {photoError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">Document / Photo Reading Issue:</p>
                    <p className="text-rose-800 leading-relaxed mt-0.5">{photoError}</p>
                    <p className="text-[11px] text-rose-700 mt-1">
                      💡 Tip: Ensure the PDF text is clear or the photo has good lighting and legible text.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Text & Translation Display (After Vision/PDF OCR completes) */}
            {photoExtractedData && (
              <div className="space-y-4 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                
                {/* Meta stats banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Text Extracted Successfully!</span>
                      <span className="ml-2 font-medium text-emerald-800">
                        "{photoExtractedData.title}"
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 font-semibold text-[11px]">
                      {photoExtractedData.sourceLanguage || 'English'} Detected
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{photoExtractedData.totalDetected || 0} Difficult Words</span>
                    </span>
                  </div>
                </div>

                {/* Extracted Text Display Preview */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Extracted Original Text ({photoExtractedData.extractedParagraphs?.length || 1} Paragraphs)
                  </span>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto text-xs font-serif leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {photoExtractedData.extractedText}
                  </div>
                </div>

                {/* Translated Preview */}
                {photoExtractedData.translatedParagraphs && photoExtractedData.translatedParagraphs.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-brand-800 uppercase tracking-wider block">
                      AI Generated Translation ({photoExtractedData.targetLanguage || 'हिन्दी / मराठी / English'})
                    </span>
                    <div className="p-3.5 bg-brand-50/70 rounded-2xl border border-brand-200 max-h-36 overflow-y-auto text-xs font-hindi leading-relaxed text-slate-900 whitespace-pre-wrap">
                      {photoExtractedData.translatedParagraphs.join('\n\n')}
                    </div>
                  </div>
                )}

                {/* Modal Footer: Load Into Dual Reader Button */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold"
                  >
                    Upload Another File
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadPhotoIntoReader}
                    className="flex-1 py-3 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open in Dual AI Reader →</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Lightbox Modal for Original Scanned Photo */}
      {viewingOriginalPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-800 text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Camera className="w-4 h-4 text-brand-400" />
                <span>Original Scanned Photo Source</span>
              </div>
              <button
                onClick={() => setViewingOriginalPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden rounded-2xl bg-black/40">
              <img
                src={viewingOriginalPhoto}
                alt="Original scanned photo"
                className="max-h-[72vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button to launch AI Tutor */}
      {!showTutorDrawer && (
        <button
          onClick={() => setShowTutorDrawer(true)}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-brand-500/35 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/20 group cursor-pointer"
          title="Open Paarth AI Reading Tutor"
        >
          <Bot className="w-4 h-4 animate-bounce group-hover:scale-110" />
          <span>Ask Paarth AI</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">Tutor</span>
        </button>
      )}

      {/* AI Reading Tutor Drawer */}
      <AiTutorDrawer
        isOpen={showTutorDrawer}
        onClose={() => setShowTutorDrawer(false)}
        storyTitle={activeStory.title}
        activeParagraph={activeStory.paragraphs[activeParagraphIndex] || activeStory.paragraphs[0]}
        activeParagraphIndex={activeParagraphIndex}
        totalParagraphs={activeStory.paragraphs.length}
        fullText={activeStory.paragraphs.map(p => p.source).join('\n\n')}
        sourceLang={activeStory.sourceLang}
        sourceLangName={activeStory.sourceLangName}
        targetLang={activeStory.targetLang}
        targetLangName={activeStory.targetLangName}
        detectedWords={detectedWords}
      />

    </div>
  );
}
