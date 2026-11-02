# Paarth (पार्थ) — AI-Powered Bilingual Reading Companion

> **"Master foreign literature and languages through the stories you love."**

Paarth is a modern educational SaaS application engineered for dual-language readers and learners. It combines synchronized dual-text alignment, instant tap-to-translate with contextual nuances, audio pronunciation, a spaced repetition vocabulary bank, and real-time AI vocabulary detection powered by Google Gemini.

---

## 🌟 Key Features

1. **AI Photo Reader (Gemini Vision OCR)**:
   - **`POST /api/analyze-image`**: Upload or drag-and-drop photos of physical book pages, printed articles, signs, or documents (JPG, JPEG, PNG).
   - **OCR & Layout Preservation**: Extracts text verbatim while preserving paragraphs, headings, and punctuation.
   - **Automatic Language Detection**: Detects source language (English or Hindi).
   - **Bilingual Aligned Translation**: Automatically translates extracted paragraphs into natural Hindi.
   - **Quality Guardrails**: Detects blurry, dark, or unreadable images and returns clear guidance.
   - **Privacy First**: Images are processed strictly in memory with Multer `memoryStorage` and are never permanently stored.

2. **AI-Powered Reading Analysis with Google Gemini**:
   - Integrated with the **official Google Gemini SDK (`@google/genai`)**.
   - **`POST /api/analyze`**: Scans articles, analyzes sentence contexts, and identifies difficult terms and idioms.
   - **3 Reader Levels**:
     - **Level 1 (Learner)**: Generous vocabulary highlighting (~15–25 words, descriptive adjectives, common idioms).
     - **Level 2 (Intermediate)**: Nuanced literary terms and metaphors (~6–12 words).
     - **Level 3 (Technical Jargon)**: Strictly rare, academic, domain-specific terminology and specialized jargon (~3–6 words).
   - **Functional Dual-Language Explanations**: Returns English meanings, Hindi meanings (हिन्दी अर्थ), IPA phonetics, part-of-speech, and contextual usage examples.

2. **Synchronized Dual-Language AI Reader**:
   - **Interactive Word Highlighting**: AI-detected words are highlighted with badges in the text.
   - **Meaning Popup & Inspector**: Clicking any highlighted word opens a rich drawer/popup with functional Hindi and English explanations.
   - **Reading Layouts**: Side-by-side Split View, Sentence-by-sentence Interlinear View, and Single-text Focus Mode.
   - **Custom Text Importer**: Paste any personal article or document to analyze and read bilingually.

3. **My Words & Flashcard Bank**:
   - Vocabulary retention dashboard with real-time stats (Total Saved, Mastered, Learning, Needs Review).
   - **Interactive Flashcards Mode**: 3D card flipping with "Need Practice" and "I Got This!" mastery actions.
   - **Card Grid View**: Search, tag filtering, audio review, and manual word creation.
   - **Export**: One-click JSON backup of your vocabulary.

4. **Modern Educational SaaS Theme**:
   - Clean slate & brand blue palette (`#2563eb`, `#1e40af`, `#0f172a`).
   - Fully responsive for desktop, tablet, and mobile with dynamic viewport units (`dvh`).

---

## ⚙️ Configuration & Environment

The Gemini API key is securely managed on the backend and is **never** exposed to the frontend client.

1. Open `backend/.env` (or copy from `backend/.env.example`):
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=5001
   GEMINI_MODEL=gemini-2.5-flash
   ```
   *(You can obtain a key at [Google AI Studio](https://aistudio.google.com/app/apikey))*

---

## 🚀 Exact Commands to Run Locally

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Run Both Backend and Frontend Together
```bash
npm run dev:all
```
This concurrently starts:
- **Express Backend**: [http://localhost:5001](http://localhost:5001)
- **Vite Frontend**: [http://localhost:5173](http://localhost:5173)

*Alternatively, you can run them in two separate terminal windows:*
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 📁 Project Architecture

```
Paarth/
├── backend/
│   ├── .env                   # Secret Gemini API key (git-ignored)
│   ├── .env.example           # Example configuration template
│   ├── package.json           # Express, CORS, Dotenv, @google/genai
│   └── server.js              # Express server & POST /api/analyze endpoint
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # App shell, localStorage persistence & toast notifications
│   ├── index.css              # Tailwind base, custom scrollbars, highlight animations
│   ├── components/
│   │   ├── Navbar.jsx         # Navigation bar with live badges & mobile drawer
│   │   └── Footer.jsx         # SaaS footer with supported languages
│   ├── pages/
│   │   ├── HomePage.jsx       # SaaS landing page with live interactive preview widget
│   │   ├── ReaderPage.jsx     # AI Reader with Level 1-3 selector, word highlighter & popup
│   │   └── MyWordsPage.jsx    # Vocabulary bank with 3D flashcards and analytics
│   └── data/
│       └── mockData.js        # Bilingual literature excerpts & rich dictionary dataset
├── package.json               # Frontend dependencies & root orchestration scripts
├── vite.config.js             # Vite config with API reverse proxy to port 5001
└── tailwind.config.js         # Custom brand colors & typography
```
