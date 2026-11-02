// Unified High-Quality Speech & Pronunciation Service for Paarth
// Solves:
// 1. Chrome 15-second cutoff / garbage collection bug (prevents mid-sentence silence)
// 2. Missing Marathi (mr-IN) voice on Mac/Chrome -> smooth fallback to native Devanagari Hindi voices (Lekha / Google हिन्दी)
// 3. Robotic/muffled audio -> selects premium natural voices (Samantha, Alex, Google US English) & optimizes rate (0.95), pitch (1.0), volume (1.0)
// 4. Chrome stuck paused state -> automatic resume() and buffer unfreezing
// 5. Multi-sentence paragraph chunking for seamless full-passage reading

// Prevent Chrome V8 garbage collection from terminating speech mid-audio
const activeUtterances = new Set();
let keepAliveTimer = null;
let cachedVoices = [];

// Initialize voices and listen for voice changes (Chrome loads voices asynchronously)
function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

initVoices();

/**
 * Find the optimal voice available on the user's OS and browser.
 */
export function findBestVoice(lang, text = '') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const isDevanagari = /[\u0900-\u097F]/.test(text);

  // 1. DEVANAGARI (Hindi / Marathi) text
  if (isDevanagari || lang === 'mr' || lang === 'mr-IN' || lang === 'hi' || lang === 'hi-IN') {
    // If Marathi requested, check if browser has a native Marathi voice
    if (lang === 'mr' || lang === 'mr-IN') {
      const marathiVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('mr') || 
        v.name.toLowerCase().includes('marathi')
      );
      if (marathiVoice) return marathiVoice;
    }

    // High-quality Hindi/Devanagari voices on Mac & Chrome
    // Lekha (Apple macOS Hindi), Google हिन्दी (Chrome), or any hi-IN voice
    const preferredHindi = voices.find(v => 
      v.name.toLowerCase().includes('lekha') || 
      v.name.includes('हिन्दी') ||
      v.name.toLowerCase().includes('google hindi')
    );
    if (preferredHindi) return preferredHindi;

    const anyHindi = voices.find(v => 
      v.lang.toLowerCase().startsWith('hi') || 
      v.lang.toLowerCase().replace('_', '-').includes('hi-in')
    );
    if (anyHindi) return anyHindi;

    // Fallback to any Indian accent voice if available
    const indianVoice = voices.find(v => v.lang.toLowerCase().includes('in'));
    if (indianVoice) return indianVoice;
  }

  // 2. ENGLISH text
  // Filter out novelty/distorted robot voices on Mac/Windows
  const noveltyVoices = new Set([
    'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
    'deranged', 'good news', 'hysterical', 'pipe organ', 'trinoids',
    'whisper', 'zarvox', 'junior', 'kathy', 'ralph', 'albert', 'fred'
  ]);

  // Preferred natural human voices for English
  const preferredEnglishNames = [
    'samantha', 'google us english', 'alex', 'karen', 'daniel',
    'victoria', 'google uk english female', 'oliver', 'serena', 'allison', 'ava'
  ];

  for (const name of preferredEnglishNames) {
    const voice = voices.find(v => 
      v.name.toLowerCase().includes(name) && 
      !noveltyVoices.has(v.name.toLowerCase())
    );
    if (voice) return voice;
  }

  // Next: Any standard en-US or en-GB voice that is not novelty
  const standardEn = voices.find(v => 
    (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')) &&
    !noveltyVoices.has(v.name.toLowerCase())
  );
  if (standardEn) return standardEn;

  // Fallback to default system voice
  return voices.find(v => v.default) || voices[0] || null;
}

/**
 * Splits long paragraphs or tutor responses into crisp, natural sentences
 * to prevent Chrome's 15-second speech synthesis timeout bug.
 */
function splitTextIntoChunks(text, maxChars = 160) {
  if (!text || text.length <= maxChars) return [text];

  // Split on sentence boundaries: period, exclamation, question mark, Hindi purna viram (।)
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]+|[^.!?।\n]+$/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxChars) {
      currentChunk = (currentChunk + ' ' + trimmed).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      // If a single sentence is super long, break by commas or clauses
      if (trimmed.length > maxChars) {
        const subParts = trimmed.split(/([,;:\-–—]+)/);
        let subChunk = '';
        for (const part of subParts) {
          if ((subChunk + part).length <= maxChars) {
            subChunk += part;
          } else {
            if (subChunk) chunks.push(subChunk.trim());
            subChunk = part;
          }
        }
        if (subChunk.trim()) currentChunk = subChunk.trim();
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Stop any ongoing speech and clear active queues.
 */
export function stopSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
  activeUtterances.clear();
  window.speechSynthesis.cancel();
}

/**
 * Check if the browser is currently speaking
 */
export function isSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Play text with high fidelity, optimal rate, volume, and automatic language detection.
 *
 * @param {string} rawText - Text to speak
 * @param {Object} options - Configuration options
 * @param {string} [options.lang] - Target language ('en-US', 'hi-IN', 'mr-IN', 'mr', 'hi', 'en')
 * @param {number} [options.rate=0.96] - Speaking rate (0.95-1.0 sounds most natural)
 * @param {number} [options.pitch=1.0] - Voice pitch
 * @param {number} [options.volume=1.0] - Voice volume (0.0 to 1.0, maximum audibility)
 * @param {Function} [options.onStart] - Callback when speech starts
 * @param {Function} [options.onEnd] - Callback when all chunks finish speaking
 * @param {Function} [options.onError] - Callback on error
 */
export function playSpeech(rawText, options = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[Paarth Speech] Web Speech API is not supported in this browser.');
    return;
  }

  if (!rawText || !rawText.trim()) return;

  // Stop any active speech first
  stopSpeech();

  // If Chrome was stuck in paused state, resume it immediately
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Clean markdown, symbols, and formatting for clean audible speech
  const cleanText = rawText
    .replace(/[*#_`~>\[\]()]/g, '') // strip markdown
    .replace(/https?:\/\/\S+/g, '') // strip urls
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
  let effectiveLang = options.lang || (isDevanagari ? 'hi-IN' : 'en-US');

  // Normalize lang codes
  if (effectiveLang === 'mr' || effectiveLang === 'mr-IN') {
    effectiveLang = 'mr-IN';
  } else if (effectiveLang === 'hi' || effectiveLang === 'hi-IN') {
    effectiveLang = 'hi-IN';
  } else if (effectiveLang === 'en') {
    effectiveLang = 'en-US';
  }

  const bestVoice = findBestVoice(effectiveLang, cleanText);

  // If Marathi requested and bestVoice is Hindi (since Mac has Lekha), adjust utterance lang to match voice
  let voiceLang = effectiveLang;
  if (bestVoice) {
    voiceLang = bestVoice.lang;
  } else if (isDevanagari && effectiveLang === 'mr-IN') {
    voiceLang = 'hi-IN'; // Fallback to Hindi locale so browser doesn't try English synthesizer
  }

  const chunks = splitTextIntoChunks(cleanText, 160);
  let currentChunkIndex = 0;

  // Keep-alive interval for Chrome to prevent audio pausing on long sentences
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, 3000);

  function speakNextChunk() {
    if (currentChunkIndex >= chunks.length) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
      if (options.onEnd) options.onEnd();
      return;
    }

    const chunkText = chunks[currentChunkIndex];
    currentChunkIndex++;

    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.lang = voiceLang;
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Audio clarity settings:
    // Volume: 1.0 (Maximum audibility)
    // Rate: 0.96 for clear, articulate pacing (avoids the sluggish 0.85 robotic drag)
    // Pitch: 1.0 for warm, natural tone
    utterance.volume = typeof options.volume === 'number' ? options.volume : 1.0;
    utterance.rate = typeof options.rate === 'number' ? options.rate : (isDevanagari ? 0.92 : 0.96);
    utterance.pitch = typeof options.pitch === 'number' ? options.pitch : 1.0;

    // Prevent V8 garbage collection
    activeUtterances.add(utterance);

    utterance.onstart = () => {
      if (currentChunkIndex === 1 && options.onStart) {
        options.onStart();
      }
    };

    utterance.onend = () => {
      activeUtterances.delete(utterance);
      // Continue with next chunk with a tiny 40ms natural breath pause
      setTimeout(speakNextChunk, 40);
    };

    utterance.onerror = (event) => {
      activeUtterances.delete(utterance);
      // 'interrupted' or 'canceled' are normal when user clicks another word or stops
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('[Paarth Speech] Utterance error:', event);
      }
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
      if (options.onError) options.onError(event);
    };

    // Small delay before speak allows Chrome audio buffers to settle
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Paarth Speech] Speak call failed:', err);
      }
    }, 15);
  }

  // Start first chunk
  speakNextChunk();
}

export default {
  playSpeech,
  stopSpeech,
  isSpeaking,
  findBestVoice
};
