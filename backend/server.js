import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Determine dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial load
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Multer memory storage configuration (Never permanently stores uploaded files, supports Images + PDFs)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for PDFs and photos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    const mime = (file.mimetype || '').toLowerCase();
    const isPdfExt = Boolean(file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));
    if (allowedMimeTypes.includes(mime) || (mime === 'application/octet-stream' && isPdfExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload a PDF document or a JPG, JPEG, PNG, or WebP image.'));
    }
  }
});

// Multer error-handling wrapper middleware (accepts 'image', 'file', or 'document')
const uploadImageMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File is too large. Maximum allowed size is 15MB.'
        });
      }
      return res.status(400).json({
        error: err.message || 'Failed to process uploaded file.'
      });
    }
    // Normalize file object to req.file if uploaded through any field
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Helper to dynamically read the current Gemini API key from backend/.env or process.env
function getApiKey() {
  try {
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      const parsed = dotenv.parse(fs.readFileSync(envFile, 'utf8'));
      if (parsed.GEMINI_API_KEY && !parsed.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
        return parsed.GEMINI_API_KEY.trim();
      }
    }
  } catch (e) {
    console.warn('[Paarth Backend] Could not re-read backend/.env dynamically:', e.message);
  }
  const fallback = process.env.GEMINI_API_KEY || '';
  return fallback.includes('YOUR_GEMINI_API_KEY') ? '' : fallback.trim();
}

// Helper with timeout to prevent hanging requests
async function generateWithTimeout(promise, timeoutMs = 25000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper to robustly extract and parse JSON from AI response
function extractJson(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Try direct parse
  try {
    return JSON.parse(text.trim());
  } catch (e) {}

  // 2. Try markdown code block ```json ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }

  // 3. Try finding outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch (e) {}
  }

  return null;
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const currentKey = getApiKey();
  const hasKey = Boolean(currentKey && currentKey.length > 10);
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    model: process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite',
    timestamp: new Date().toISOString()
  });
});

// POST /api/translate - Translate arbitrary paragraphs (Bidirectional: English <-> Hindi)
app.post('/api/translate', async (req, res) => {
  try {
    const { text, paragraphs, targetLang, sourceLang } = req.body;
    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in backend/.env.'
      });
    }

    const inputParagraphs = Array.isArray(paragraphs) && paragraphs.length > 0
      ? paragraphs
      : (typeof text === 'string' ? text.split('\n\n').filter(p => p.trim()) : []);

    if (inputParagraphs.length === 0) {
      return res.status(400).json({ error: 'No text provided for translation.' });
    }

    const combinedText = inputParagraphs.join('\n\n');
    const hasDevanagari = /[\u0900-\u097F]/.test(combinedText);

    // Auto-detect direction if not explicitly forced
    let effectiveSourceLang = sourceLang || (hasDevanagari ? 'Hindi' : 'English');
    let effectiveTargetLang = targetLang;
    if (!effectiveTargetLang) {
      effectiveTargetLang = effectiveSourceLang === 'Hindi' ? 'English' : 'Hindi';
    } else if (effectiveSourceLang === 'Hindi' && targetLang === 'Hindi') {
      effectiveTargetLang = 'English';
    }

    const isTargetMarathi = effectiveTargetLang.toLowerCase().includes('marathi') || effectiveTargetLang.includes('मराठी');
    const isTargetHindi = !isTargetMarathi && (effectiveTargetLang.toLowerCase().includes('hindi') || effectiveTargetLang.includes('हिन्दी'));
    const targetScriptNote = isTargetMarathi ? '(मराठी)' : isTargetHindi ? '(हिन्दी)' : '';

    const prompt = `You are Paarth's professional bilingual translation engine.
Translate the following ${inputParagraphs.length} ${effectiveSourceLang} paragraph(s) into natural, culturally accurate, and fluent ${effectiveTargetLang} ${targetScriptNote}.
Preserve paragraph count and order exactly.

Return ONLY a valid JSON object with schema:
{
  "translatedParagraphs": [
    "${effectiveTargetLang} translation of paragraph 1",
    "${effectiveTargetLang} translation of paragraph 2"
  ]
}

PARAGRAPHS TO TRANSLATE:
${JSON.stringify(inputParagraphs, null, 2)}`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite',
      'models/gemini-3.1-flash-lite',
      'models/gemini-3.5-flash',
      'models/gemini-3.8-flash',
      'models/gemini-flash-latest'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let translatedResult = null;
    let lastErr = null;

    for (const m of uniqueModels) {
      try {
        console.log(`[Paarth Backend] Translating (${effectiveSourceLang} -> ${effectiveTargetLang}) with model: ${m}`);
        const response = await generateWithTimeout(
          ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          15000
        );

        const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJson(rawText);
        if (parsed && Array.isArray(parsed.translatedParagraphs)) {
          translatedResult = parsed;
          console.log(`[Paarth Backend] Translation success with ${m}!`);
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Paarth Backend] Translation attempt with ${m} failed:`, err.message);
      }
    }

    if (!translatedResult) {
      throw lastErr || new Error('Failed to translate text with Gemini.');
    }

    return res.json({
      success: true,
      sourceLang: effectiveSourceLang,
      targetLang: effectiveTargetLang,
      translatedParagraphs: translatedResult.translatedParagraphs
    });
  } catch (err) {
    console.error('[Paarth Backend] Error in /api/translate:', err);
    return res.status(500).json({ error: err.message || 'Translation failed' });
  }
});

// POST /api/analyze - Detect difficult words AND translate paragraphs (Bidirectional)
app.post('/api/analyze', async (req, res) => {
  try {
    const { article, level = 2, language, sourceLang, targetLang } = req.body;

    if (!article || (typeof article === 'string' && !article.trim())) {
      return res.status(400).json({
        error: 'Article text is required for analysis.'
      });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in backend/.env. Please add your Google Gemini API key to backend/.env and restart the server.'
      });
    }

    // Determine article paragraphs and text string
    const paragraphArray = Array.isArray(article)
      ? article.map(p => (typeof p === 'string' ? p : p.source || p.text || ''))
      : String(article).split('\n\n').filter(p => p.trim());

    const articleText = paragraphArray.join('\n\n');

    // Auto-detect script (Devanagari vs Latin)
    const hasDevanagari = /[\u0900-\u097F]/.test(articleText);
    const effectiveSourceLang = sourceLang || (hasDevanagari ? 'Hindi' : 'English');
    let effectiveTargetLang = targetLang || language;
    if (!effectiveTargetLang) {
      effectiveTargetLang = effectiveSourceLang === 'Hindi' ? 'English' : 'Hindi';
    } else if (effectiveSourceLang === 'Hindi' && (effectiveTargetLang.toLowerCase().includes('hindi') || effectiveTargetLang.includes('हिन्दी'))) {
      effectiveTargetLang = 'English';
    }

    const isSourceMarathi = effectiveSourceLang.toLowerCase().includes('marathi') || effectiveSourceLang.includes('मराठी');
    const isSourceHindi = !isSourceMarathi && (effectiveSourceLang.toLowerCase().includes('hindi') || effectiveSourceLang.includes('हिन्दी'));
    const isTargetMarathi = effectiveTargetLang.toLowerCase().includes('marathi') || effectiveTargetLang.includes('मराठी');
    const isTargetHindi = !isTargetMarathi && (effectiveTargetLang.toLowerCase().includes('hindi') || effectiveTargetLang.includes('हिन्दी'));

    // Normalize reader level (1, 2, or 3)
    let parsedLevel = 2;
    if (String(level).includes('1')) parsedLevel = 1;
    else if (String(level).includes('3')) parsedLevel = 3;

    // Strict level guidelines as specified by user
    let levelInstruction = '';
    if (parsedLevel === 1) {
      levelInstruction = `LEVEL 1 (Beginner/Learner Mode):
- The reader is developing foundational vocabulary.
- You MUST detect a GENEROUS selection of words and idiomatic phrases (typically 12 to 25 items from this article).
- Include descriptive adjectives, moderately challenging terms, idioms, and any word that an early or intermediate reader would benefit from having explained.`;
    } else if (parsedLevel === 2) {
      levelInstruction = `LEVEL 2 (Intermediate Mode):
- The reader has solid everyday vocabulary.
- You MUST detect a MODERATE, curated selection (typically 6 to 12 items).
- Highlight only truly intermediate-to-advanced literary vocabulary, nuanced metaphors, or culturally specific idioms. Skip basic or common words.`;
    } else {
      levelInstruction = `LEVEL 3 (Advanced / Technical Jargon Mode):
- The reader is fully fluent.
- You MUST detect ONLY rare, academic, domain-specific terminology, philosophical concepts, or technical jargon (typically 3 to 6 items).
- Do NOT highlight common literary or descriptive words. Highlight strictly technical and specialized jargon.`;
    }

    const prompt = (isSourceHindi || isSourceMarathi)
      ? `You are Paarth's AI Bilingual Reading Companion engine.
Analyze the following ${isSourceMarathi ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)'} reading article for a bilingual reader (Target language: ${effectiveTargetLang}).

${levelInstruction}

REQUIREMENTS:
1. Every detected term MUST appear in the article text (in Devanagari script).
2. For each detected term, provide:
   - "term": the exact word or phrase from the article
   - "category": category/role (e.g., "Cultural Idiom", "Literary Vocabulary", "Action Verb", "Descriptive Adjective", "Technical Jargon", etc.)
   - "partOfSpeech": "Noun", "Verb", "Adjective", "Adverb", "Idiom", etc.
   - "phonetic": Romanized pronunciation / phonetic guide (e.g. "Manohar / məˈnoː.ɦər")
   - "englishMeaning": Clear, contextual definition and translation in English.
   - "hindiMeaning": Simple native explanation in ${isTargetMarathi ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)'} with nuances.
   - "example": An illustrative sentence showing natural usage with its translation.
   - "contextSentence": The specific sentence or clause from the article where this word/phrase appears.
3. In "translatedParagraphs", provide the natural, complete, fluent ${effectiveTargetLang} translation for each of the ${paragraphArray.length} paragraph(s) in matching order.

Return ONLY a valid JSON object with the following structure:
{
  "level": ${parsedLevel},
  "sourceLanguage": "${isSourceMarathi ? 'Marathi' : 'Hindi'}",
  "targetLanguage": "${effectiveTargetLang}",
  "totalDetected": number,
  "translatedParagraphs": [
    "Complete ${effectiveTargetLang} translation for paragraph 1",
    "Complete ${effectiveTargetLang} translation for paragraph 2"
  ],
  "detectedWords": [
    {
      "term": "string",
      "category": "string",
      "partOfSpeech": "string",
      "phonetic": "string",
      "englishMeaning": "string",
      "hindiMeaning": "string",
      "example": "string",
      "contextSentence": "string"
    }
  ]
}

ARTICLE PARAGRAPHS:
${JSON.stringify(paragraphArray, null, 2)}`
      : `You are Paarth's AI Bilingual Reading Companion engine.
Analyze the following English reading article for a bilingual reader (Target language: ${effectiveTargetLang} ${isTargetMarathi ? '(मराठी)' : isTargetHindi ? '(हिन्दी)' : ''}).

${levelInstruction}

REQUIREMENTS:
1. Every detected term MUST appear in the article text (as a single word or multi-word phrase).
2. For each detected term, provide:
   - "term": the exact word or phrase from the article
   - "category": category/role (e.g., "Descriptive Adjective", "Technical Jargon", "Action Verb", "Literary Term", "Idiom", etc.)
   - "partOfSpeech": "Noun", "Verb", "Adjective", "Adverb", "Idiom", etc.
   - "phonetic": accurate IPA phonetic transcription (e.g. "/praɪˈmiː.vəl/")
   - "englishMeaning": Clear, contextual definition in English.
   - "hindiMeaning": Accurate ${isTargetMarathi ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)'} translation and meaning with nuances.
   - "example": An illustrative sentence showing natural usage.
   - "contextSentence": The specific sentence or clause from the article where this word/phrase appears.
3. In "translatedParagraphs", provide the natural, complete, fluent ${effectiveTargetLang} ${isTargetMarathi ? '(मराठी)' : isTargetHindi ? '(हिन्दी)' : ''} translation for each of the ${paragraphArray.length} paragraph(s) in matching order.

Return ONLY a valid JSON object with the following structure:
{
  "level": ${parsedLevel},
  "sourceLanguage": "English",
  "targetLanguage": "${effectiveTargetLang}",
  "totalDetected": number,
  "translatedParagraphs": [
    "Complete ${effectiveTargetLang} translation for paragraph 1",
    "Complete ${effectiveTargetLang} translation for paragraph 2"
  ],
  "detectedWords": [
    {
      "term": "string",
      "category": "string",
      "partOfSpeech": "string",
      "phonetic": "string",
      "englishMeaning": "string",
      "hindiMeaning": "string",
      "example": "string",
      "contextSentence": "string"
    }
  ]
}

ARTICLE PARAGRAPHS:
${JSON.stringify(paragraphArray, null, 2)}`;

    // Initialize Gemini SDK with official @google/genai
    const ai = new GoogleGenAI({ apiKey });

    // Models ordered by reliability and speed
    const candidateModels = [
      process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite',
      'models/gemini-3.1-flash-lite',
      'models/gemini-3.5-flash',
      'models/gemini-3.8-flash',
      'models/gemini-flash-latest'
    ];
    const modelsToTry = [...new Set(candidateModels)];

    let lastError = null;
    let jsonResult = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Paarth Backend] Attempting analysis with model: ${modelName}`);
        const response = await generateWithTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          18000
        );

        const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error(`Empty response received from model ${modelName}`);
        }

        jsonResult = extractJson(rawText);
        if (jsonResult && Array.isArray(jsonResult.detectedWords)) {
          console.log(`[Paarth Backend] Success with ${modelName}! Detected ${jsonResult.detectedWords.length} words and ${jsonResult.translatedParagraphs?.length || 0} translated paragraphs.`);
          break; // Successfully obtained and parsed JSON
        } else {
          throw new Error('Failed to parse structured JSON from model output');
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Paarth Backend] Model "${modelName}" error:`, err.message);
      }
    }

    if (!jsonResult || !Array.isArray(jsonResult.detectedWords)) {
      throw lastError || new Error('Failed to generate structured analysis from Gemini');
    }

    // Return structured response
    return res.json({
      success: true,
      level: parsedLevel,
      sourceLanguage: effectiveSourceLang,
      targetLanguage: effectiveTargetLang,
      language: effectiveTargetLang,
      totalDetected: jsonResult.detectedWords.length,
      detectedWords: jsonResult.detectedWords,
      translatedParagraphs: Array.isArray(jsonResult.translatedParagraphs) ? jsonResult.translatedParagraphs : []
    });

  } catch (error) {
    console.error('[Paarth Backend] Error in /api/analyze:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred while analyzing the article with Gemini.'
    });
  }
});

// POST /api/analyze-image and /api/analyze-doc - AI Document & Photo Reader (PDF & Image OCR + Multimodal Analysis)
const handleDocumentAnalysis = async (req, res) => {
  try {
    const uploadedFile = req.file || (req.files && req.files[0]);
    if (!uploadedFile) {
      return res.status(400).json({
        error: 'No file uploaded. Please upload a PDF document or a JPG, JPEG, PNG, or WebP image.'
      });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in backend/.env. Please configure your key to use the Document & Photo Reader.'
      });
    }

    const { level = 2, targetLanguage = 'Hindi' } = req.body;

    const isPdf = Boolean(
      (uploadedFile.mimetype || '').toLowerCase() === 'application/pdf' ||
      (uploadedFile.originalname && uploadedFile.originalname.toLowerCase().endsWith('.pdf'))
    );
    const mimeType = isPdf ? 'application/pdf' : (uploadedFile.mimetype || 'image/jpeg');

    // Parse reader level (1, 2, or 3)
    let parsedLevel = 2;
    if (String(level).includes('1')) parsedLevel = 1;
    else if (String(level).includes('3')) parsedLevel = 3;

    // Level guidance for vocabulary extraction
    let levelInstruction = '';
    if (parsedLevel === 1) {
      levelInstruction = `LEVEL 1 (Beginner / Learner Mode):
- Detect a generous selection of words and phrases (~10 to 20 terms) from the extracted text that an early or developing reader might find challenging.
- Include descriptive adjectives, verbs, common idioms, and intermediate terms.`;
    } else if (parsedLevel === 2) {
      levelInstruction = `LEVEL 2 (Intermediate Mode):
- Detect a curated selection (~6 to 12 terms) focusing on literary, sophisticated, or nuanced expressions.`;
    } else {
      levelInstruction = `LEVEL 3 (Advanced / Technical Jargon Mode):
- Detect strictly rare, academic, domain-specific, or technical jargon terms (~3 to 6 terms).`;
    }

    const isTargetMarathi = (targetLanguage || '').toLowerCase().includes('marathi') || (targetLanguage || '').includes('मराठी');
    const isTargetHindi = !isTargetMarathi && ((targetLanguage || '').toLowerCase().includes('hindi') || (targetLanguage || '').includes('हिन्दी'));

    const visionPrompt = `You are Paarth's AI-Powered Bilingual Document & Photo Reader (PDF & Multimodal Vision OCR System).
Carefully examine the uploaded ${isPdf ? 'PDF document' : 'image/document'} (which may be a book page, article, essay, letter, report, or snapshot).

TASK 1: READABILITY & OCR
1. Check if the ${isPdf ? 'PDF document' : 'image'} contains readable text.
   - If blurry, corrupted, blank, or completely unreadable, set "isReadable": false and provide a clear "unreadableReason".
2. If readable text exists:
   - Set "isReadable": true.
   - Accurately extract all readable text verbatim. Preserve paragraphs, line breaks, punctuation, and headings.
   - Split the text into "extractedParagraphs" (array of strings, one per logical paragraph).
   - Detect the "sourceLanguage" (e.g. "English", "Hindi", "Marathi", etc.).
   - Infer an appropriate, concise "title" for the document (e.g. from headings, or first sentence).

TASK 2: BILINGUAL TRANSLATION (Target Language: ${targetLanguage})
- Detect the sourceLanguage of the document accurately (e.g. "Hindi", "Marathi", "English", etc.).
- Translate each extracted paragraph into natural, complete, fluent ${targetLanguage} ${isTargetMarathi ? '(मराठी)' : isTargetHindi ? '(हिन्दी)' : ''}.
- In "translatedParagraphs", provide the natural, complete, fluent translation for each extracted paragraph in exact matching order.

TASK 3: VOCABULARY DETECTION (Level ${parsedLevel})
${levelInstruction}
- For each detected term from the extracted text:
  - "term": verbatim word or phrase from the extracted text
  - "category": e.g. "Cultural Idiom", "Descriptive Adjective", "Technical Jargon", "Action Verb", "Literary Term"
  - "partOfSpeech": "Noun", "Verb", "Adjective", "Adverb", "Idiom", etc.
  - "phonetic": accurate phonetic transcription / transliteration (e.g. "/praɪˈmiː.vəl/" or pronunciation guide)
  - "englishMeaning": Clear, contextual definition in English.
  - "hindiMeaning": Simple, accurate meaning in ${isTargetMarathi ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)'} with cultural nuances.
  - "example": Everyday illustrative sentence showing natural usage (with translation).
  - "contextSentence": The sentence from the extracted text where this word/phrase appears.

Return ONLY a valid JSON object matching this schema:
{
  "isReadable": true,
  "unreadableReason": null,
  "isPdf": ${isPdf},
  "title": "string",
  "sourceLanguage": "string",
  "targetLanguage": "${targetLanguage}",
  "level": ${parsedLevel},
  "extractedText": "full extracted text",
  "extractedParagraphs": ["paragraph 1", "paragraph 2"],
  "translatedParagraphs": ["Translation of paragraph 1", "Translation of paragraph 2"],
  "totalDetected": number,
  "detectedWords": [
    {
      "term": "string",
      "category": "string",
      "partOfSpeech": "string",
      "phonetic": "string",
      "englishMeaning": "string",
      "hindiMeaning": "string",
      "example": "string",
      "contextSentence": "string"
    }
  ]
}`;

    // Base64 encoding of file buffer (never saved to disk)
    const base64File = uploadedFile.buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey });

    // Models supporting Multimodal Vision/PDF in order of preference
    const candidateModels = [
      process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite',
      'models/gemini-3.1-flash-lite',
      'models/gemini-3.5-flash',
      'models/gemini-3.8-flash',
      'models/gemini-flash-latest'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let visionResult = null;
    let lastErr = null;

    for (const m of uniqueModels) {
      try {
        console.log(`[Paarth Backend] Multimodal OCR processing (${isPdf ? 'PDF' : 'Image'}) with model: ${m} (File: ${uploadedFile.originalname}, Size: ${(uploadedFile.size / 1024).toFixed(1)} KB)`);
        const response = await generateWithTimeout(
          ai.models.generateContent({
            model: m,
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: base64File
                }
              },
              visionPrompt
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          28000
        );

        const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJson(rawText);

        if (parsed) {
          visionResult = parsed;
          console.log(`[Paarth Backend] Multimodal OCR success with ${m}! isReadable: ${parsed.isReadable}`);
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Paarth Backend] Multimodal attempt with ${m} failed:`, err.message);
      }
    }

    if (!visionResult) {
      throw lastErr || new Error('Failed to analyze document with Gemini');
    }

    // Handle unreadable document
    if (visionResult.isReadable === false) {
      return res.status(422).json({
        success: false,
        isReadable: false,
        error: visionResult.unreadableReason || 'The document text could not be read clearly. Please try uploading a clearer PDF or photo.'
      });
    }

    const extractedParagraphs = Array.isArray(visionResult.extractedParagraphs) && visionResult.extractedParagraphs.length > 0
      ? visionResult.extractedParagraphs
      : (visionResult.extractedText || '').split('\n\n').filter(p => p.trim());

    const translatedParagraphs = Array.isArray(visionResult.translatedParagraphs)
      ? visionResult.translatedParagraphs
      : [];

    const detectedWords = Array.isArray(visionResult.detectedWords)
      ? visionResult.detectedWords
      : [];

    return res.json({
      success: true,
      isReadable: true,
      isPdf,
      fileName: uploadedFile.originalname,
      title: visionResult.title || (isPdf ? uploadedFile.originalname.replace(/\.[^/.]+$/, '') : 'Scanned Document'),
      sourceLanguage: visionResult.sourceLanguage || 'English',
      targetLanguage: visionResult.targetLanguage || targetLanguage,
      level: parsedLevel,
      extractedText: visionResult.extractedText || extractedParagraphs.join('\n\n'),
      extractedParagraphs,
      translatedParagraphs,
      totalDetected: detectedWords.length,
      detectedWords
    });

  } catch (error) {
    console.error('[Paarth Backend] Error in Document Analysis:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while processing the document with Gemini.'
    });
  }
};

app.post('/api/analyze-image', uploadImageMiddleware, handleDocumentAnalysis);
app.post('/api/analyze-doc', uploadImageMiddleware, handleDocumentAnalysis);

// Local fallback generator for AI Tutor when offline or during network dropouts
function generateLocalTutorFallback(question, storyTitle, activeParagraph, sourceLang, targetLang) {
  const qLower = (question || '').toLowerCase().trim();
  const sourceText = activeParagraph?.source || '';
  const targetText = activeParagraph?.target || '';

  // Greetings
  if (['hi', 'hello', 'hey', 'namaste', 'how are you', 'howdy', 'sup'].some(g => qLower === g || qLower.startsWith(g + ' ') || qLower.startsWith(g + '?') || qLower.startsWith(g + '!'))) {
    return `**Hello and Namaste!** 🙏\n\nI am your Paarth AI Reading Tutor, and I am following along with **"${storyTitle || 'The Little Prince'}"**.\n\nYou can ask me:\n- 📝 *Summarize this paragraph*\n- 💡 *Explain metaphors and tone*\n- ❓ *Quiz my comprehension*\n- 🇮🇳 *Explain in Hindi or Marathi*\n\nWhat would you like to explore about the selected paragraph?`;
  }

  // Summary request
  if (qLower.includes('summar') || qLower.includes('core idea') || qLower.includes('main point') || qLower.includes('takeaway')) {
    return `### 📝 Paragraph Summary:\n\n**Source Excerpt:**\n> "${sourceText}"\n\n**Key Takeaway:**\nThis excerpt explores the core theme of the passage. It highlights how the narrator observes the world through a unique lens, contrasting childlike imagination with adult literalism.\n\n**${targetLang || 'Hindi'} Meaning:**\n${targetText}\n\n*Tap any individual word in the dual reader for a deep grammatical analysis!*`;
  }

  // Hindi explanation
  if (qLower.includes('hindi') || qLower.includes('हिन्दी')) {
    return `### 🇮🇳 हिन्दी में सारांश व व्याख्या:\n\n**गद्यांश का मूल भाव:**\n${targetText || sourceText}\n\n**कथा का संदेश:**\nयह परिच्छेद हमें लेखक के दृष्टिकोण से जोड़ता है। यह दर्शाता है कि कैसे कल्पना और वास्तविकता के बीच का अंतर कहानी को आगे बढ़ाता है।\n\nयदि आप किसी विशिष्ट शब्द या मुहावरे का अर्थ जानना चाहते हैं, तो बेझिझक पूछें!`;
  }

  // Marathi explanation
  if (qLower.includes('marathi') || qLower.includes('मराठी')) {
    return `### 🌺 मराठीत सारांश व विश्लेषण:\n\n**परिच्छेदाचा मूळ अर्थ:**\n${targetText || sourceText}\n\n**महत्त्वाचे पैलू:**\nहा परिच्छेद कथेचा एक मुख्य टप्पा दर्शवतो, जिथे लेखकाची कल्पकता आणि सभोवतालचे जग यातील नाते स्पष्ट होते.\n\nकोणत्याही विशिष्ट शब्दाचा सखोल अर्थ किंवा संदर्भ जाणून घेण्यासाठी मला विचारा!`;
  }

  // Comprehension Quiz
  if (qLower.includes('quiz') || qLower.includes('question') || qLower.includes('test')) {
    return `### ❓ Reading Comprehension Check:\n\n**Question:** Based on the excerpt, what is the central tension or realization expressed in this paragraph?\n\n1. A conflict between creative imagination and rigid literal understanding\n2. A technical description of wildlife behavior\n3. An argument about geographical locations\n4. A mathematical calculation\n\n*Hint: Option 1 best captures the philosophical theme!*`;
  }

  // Metaphors & Tone
  if (qLower.includes('metaphor') || qLower.includes('tone') || qLower.includes('nuance') || qLower.includes('style')) {
    return `### 💡 Literary Tone & Metaphors:\n\n**Tone:** Reflective, poignant, and gently questioning.\n\n**Underlying Metaphor:** The excerpt uses physical imagery to represent psychological barriers — how people often see only the external surface rather than the deeper truth underneath.\n\n**Nuance:** Notice the shift from simple childhood wonder to complex philosophical insight.`;
  }

  // Default helpful response
  return `### 📘 Reading Insight for "${storyTitle || 'Active Story'}":\n\nRegarding your question: *"${question}"*\n\n**Active Passage Context:**\n> "${sourceText.slice(0, 220)}${sourceText.length > 220 ? '...' : ''}"\n\n**Translation:**\n${targetText.slice(0, 220)}${targetText.length > 220 ? '...' : ''}\n\nFeel free to ask me for a summary, character motivations, or specific word origins!`;
}

// POST /api/tutor - Interactive AI Reading Tutor & Discussion Companion
app.post('/api/tutor', async (req, res) => {
  try {
    const {
      message,
      storyTitle,
      activeParagraph,
      fullText,
      sourceLang,
      targetLang,
      detectedWords,
      history = []
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in backend/.env.'
      });
    }

    // Build context-aware prompt for Gemini AI
    const tutorPrompt = `You are "Paarth AI", an empathetic, pedagogically brilliant bilingual reading companion and literature tutor.
Your mission is to help the student deeply understand what they are reading, appreciate linguistic nuances, overcome vocabulary hurdles, and master bilingual connections between English, Hindi, and Marathi.

CURRENT READING CONTEXT:
- Document / Story: "${storyTitle || 'Reading Passage'}"
- Active Reading Languages: Source: ${sourceLang || 'English'} ➔ Target: ${targetLang || 'Hindi'}
- Currently Selected Paragraph:
  Source: "${activeParagraph?.source || ''}"
  Aligned Translation: "${activeParagraph?.target || ''}"
${fullText ? `- Surrounding Article Excerpt:\n"${fullText.slice(0, 1500)}..."\n` : ''}
${detectedWords && detectedWords.length > 0 ? `- Detected Vocabulary in Passage: ${detectedWords.map(w => w.term || w.word).join(', ')}\n` : ''}

RECENT CONVERSATION HISTORY:
${Array.isArray(history) && history.length > 0 ? history.map(h => `${h.role === 'user' ? 'Student' : 'Paarth AI'}: ${h.content}`).join('\n') : '(New conversation)'}

STUDENT'S QUESTION OR REQUEST:
"${message}"

INSTRUCTIONS FOR YOUR RESPONSE:
1. Provide an inspiring, educational, clear, and context-aware answer.
2. If asked to explain in Hindi or Marathi, use natural, warm, and grammatically accurate Devanagari.
3. If asked to summarize, provide a crisp bulleted or short paragraph summary that highlights the emotional/thematic core.
4. If asked for a comprehension quiz, give 1 thoughtful question with 3-4 options and brief explanation.
5. If explaining vocabulary or idioms, explain their contextual nuance, etymology, and provide a memorable everyday example.
6. Keep formatting clean with markdown (bullet points, bold text). Avoid overly long robotic disclaimers. Speak like an insightful professor and friendly mentor.`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite',
      'models/gemini-3.1-flash-lite',
      'models/gemini-3.5-flash',
      'models/gemini-3.8-flash',
      'models/gemini-flash-latest'
    ];
    const modelsToTry = [...new Set(candidateModels)];

    let tutorReply = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Paarth Backend] Tutor answering question with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: tutorPrompt
        });

        if (response && response.text) {
          tutorReply = response.text.trim();
          console.log(`[Paarth Backend] Tutor answered successfully with ${modelName}!`);
          break;
        }
      } catch (err) {
        console.warn(`[Paarth Backend] Tutor attempt with ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!tutorReply) {
      console.warn('[Paarth Backend] Gemini network call failed. Providing contextual fallback response.');
      tutorReply = generateLocalTutorFallback(question, storyTitle, activeParagraph, sourceLang, targetLang);
    }

    return res.json({
      reply: tutorReply,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Paarth Backend] Error in AI Tutor:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while generating tutor response.'
    });
  }
});

app.listen(PORT, () => {
  const currentKey = getApiKey();
  console.log(`[Paarth Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Paarth Backend] Gemini API Key configured: ${Boolean(currentKey && currentKey.length > 10)}`);
});
