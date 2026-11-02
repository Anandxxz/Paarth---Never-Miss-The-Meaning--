// Paarth Chrome Extension - Content Script (Injected on any webpage)

(() => {
  console.log('%c📘 Paarth Reading Companion Active', 'background:#2563eb;color:#ffffff;padding:4px 8px;border-radius:4px;font-weight:bold;');

  let floatingBtn = null;
  let activePopup = null;
  let shadowHost = null;
  let shadowRoot = null;
  let currentSelectionText = '';
  let selectedLang = 'Hindi'; // 'Hindi' | 'Marathi'
  let lastMousePos = { x: 0, y: 0 };
  let isSelecting = false;

  // Track user mouse position continuously
  window.addEventListener('mousemove', (e) => {
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
  }, { capture: true, passive: true });

  window.addEventListener('pointerdown', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    if (shadowHost && (shadowHost.contains(e.target) || path.includes(shadowHost))) {
      return;
    }
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
    isSelecting = true;
    removePopup();
    removeFloatingBtn();
  }, { capture: true, passive: true });

  // Initialize or return isolated Shadow DOM root
  function getShadowRoot() {
    if (!shadowHost || !document.contains(shadowHost)) {
      if (shadowHost && shadowHost.parentNode) {
        shadowHost.parentNode.removeChild(shadowHost);
      }
      shadowHost = document.createElement('div');
      shadowHost.id = 'paarth-extension-shadow-host';
      shadowHost.style.cssText = 'all:initial !important;position:fixed !important;top:0 !important;left:0 !important;width:0 !important;height:0 !important;overflow:visible !important;z-index:2147483647 !important;pointer-events:none !important;';
      
      const targetParent = document.body || document.documentElement;
      targetParent.appendChild(shadowHost);
      shadowRoot = shadowHost.attachShadow({ mode: 'open' });

      // Inject self-contained styles into the shadow root
      const style = document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .paarth-pill {
          position: fixed;
          z-index: 2147483647;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          padding: 6px 13px;
          border-radius: 999px;
          box-shadow: 0 4px 18px rgba(37, 99, 235, 0.5), 0 0 0 1.5px rgba(255, 255, 255, 0.4);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          outline: none;
          user-select: none;
          pointer-events: auto !important;
          animation: paarth-pop-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .paarth-pill:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(37, 99, 235, 0.65);
        }
        @keyframes paarth-pop-in {
          from { opacity: 0; transform: scale(0.8) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .paarth-card {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
          position: fixed;
          width: 320px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.9);
          color: #0f172a;
          overflow: hidden;
          z-index: 2147483647;
          pointer-events: auto !important;
          animation: card-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes card-appear {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .paarth-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .paarth-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 13px;
          color: #1e40af;
        }
        .paarth-badge {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 5px;
          border-radius: 999px;
        }
        .paarth-close-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: #64748b;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
          line-height: 1;
        }
        .paarth-close-btn:hover { background: #e2e8f0; color: #0f172a; }
        .paarth-lang-toggle {
          display: flex;
          background: #e2e8f0;
          padding: 2px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          margin: 8px 14px 0 14px;
        }
        .paarth-lang-btn {
          flex: 1;
          text-align: center;
          padding: 4px 0;
          border-radius: 6px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #475569;
          transition: all 0.15s;
        }
        .paarth-lang-btn.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-weight: 700;
        }
        .paarth-body {
          padding: 12px 14px;
        }
        .paarth-term-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .paarth-term {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          word-break: break-word;
          max-width: 210px;
        }
        .paarth-audio-btn {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #2563eb;
          padding: 3px 8px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .paarth-audio-btn:hover { background: #dbeafe; }
        .paarth-phonetic {
          font-family: monospace;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        }
        .paarth-meaning-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .paarth-meaning-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .paarth-meaning-text {
          font-size: 13px;
          font-weight: 700;
          color: #1e3a8a;
          line-height: 1.35;
        }
        .paarth-definition {
          font-size: 11.5px;
          color: #334155;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .paarth-footer-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .paarth-btn {
          flex: 1;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .paarth-btn-primary {
          background: #2563eb;
          color: #ffffff;
        }
        .paarth-btn-primary:hover { background: #1d4ed8; }
        .paarth-btn-secondary {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #334155;
        }
        .paarth-btn-secondary:hover { background: #f1f5f9; }
        .paarth-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #cbd5e1;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `;
      shadowRoot.appendChild(style);
    }
    return shadowRoot;
  }

  // Global reference preventing Chrome Garbage Collection from silencing speech
  let activeContentUtterance = null;

  function findBestContentVoice(lang, text) {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;

    const isDev = /[\u0900-\u097F]/.test(text);
    if (isDev || lang.startsWith('hi') || lang.startsWith('mr')) {
      const hiVoice = voices.find(v => 
        v.name.toLowerCase().includes('lekha') || 
        v.name.includes('हिन्दी') ||
        v.name.toLowerCase().includes('google hindi') ||
        v.lang.toLowerCase().startsWith('hi') ||
        v.lang.toLowerCase().startsWith('mr')
      );
      if (hiVoice) return hiVoice;
    } else {
      const preferred = ['samantha', 'google us english', 'alex', 'karen', 'daniel'];
      for (const name of preferred) {
        const v = voices.find(vox => vox.name.toLowerCase().includes(name));
        if (v) return v;
      }
    }
    return null;
  }

  // High-audibility audio pronunciation via Web Speech
  function playSpeech(text, lang = 'en-US') {
    if (!('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const clean = text.replace(/[*#_`~]/g, '').trim();
    const isDevanagari = /[\u0900-\u097F]/.test(clean);
    const targetLang = isDevanagari ? 'hi-IN' : lang;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = targetLang;
    utterance.volume = 1.0; // Max volume
    utterance.rate = isDevanagari ? 0.92 : 0.96; // Crisp, clear pace
    utterance.pitch = 1.0;

    const bestVoice = findBestContentVoice(targetLang, clean);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    activeContentUtterance = utterance;
    utterance.onend = () => { activeContentUtterance = null; };
    utterance.onerror = () => { activeContentUtterance = null; };

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Paarth speech warning:', e);
      }
    }, 15);
  }

  // Remove floating button
  function removeFloatingBtn() {
    if (floatingBtn && floatingBtn.parentNode) {
      floatingBtn.parentNode.removeChild(floatingBtn);
    }
    floatingBtn = null;
  }

  // Remove popup card
  function removePopup() {
    if (activePopup && activePopup.parentNode) {
      activePopup.parentNode.removeChild(activePopup);
    }
    activePopup = null;
  }

  // Show Floating Action Pill right next to cursor / selection
  function showFloatingButton(posX, posY, text) {
    removeFloatingBtn();
    currentSelectionText = text;

    const root = getShadowRoot();
    floatingBtn = document.createElement('button');
    floatingBtn.className = 'paarth-pill';
    floatingBtn.setAttribute('type', 'button');
    floatingBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      <span>Paarth</span>
    `;

    // Calculate fixed viewport coordinates
    let left = posX + 10;
    let top = posY - 36;

    // Boundary safeguards
    if (top < 12) {
      top = posY + 16; // If near top of screen, show directly beneath cursor
    }
    if (left + 95 > window.innerWidth) {
      left = Math.max(12, posX - 95);
    }

    floatingBtn.style.left = `${Math.round(left)}px`;
    floatingBtn.style.top = `${Math.round(top)}px`;

    // Handle click on pill
    floatingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPaarthPopup(left, top + 36, text);
      removeFloatingBtn();
    });

    root.appendChild(floatingBtn);
  }

  // Show Full Meaning Popup inside Shadow DOM
  function showPaarthPopup(x, y, text) {
    removePopup();
    const root = getShadowRoot();

    const popup = document.createElement('div');
    popup.className = 'paarth-card';

    // Screen boundary check (fixed coordinates)
    const left = Math.min(window.innerWidth - 336, Math.max(12, x));
    const top = Math.min(window.innerHeight - 340, Math.max(12, y));

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;

    // Initial Loading State
    popup.innerHTML = `
      <div class="paarth-header">
        <div class="paarth-logo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span>Paarth</span>
          <span class="paarth-badge">AI Assistant</span>
        </div>
        <button class="paarth-close-btn" id="paarth-close">✕</button>
      </div>

      <div class="paarth-lang-toggle">
        <button class="paarth-lang-btn ${selectedLang === 'Hindi' ? 'active' : ''}" id="toggle-hi">To Hindi (हिन्दी)</button>
        <button class="paarth-lang-btn ${selectedLang === 'Marathi' ? 'active' : ''}" id="toggle-mr">To Marathi (मराठी)</button>
      </div>

      <div class="paarth-body" id="paarth-content">
        <div style="display: flex; align-items: center; gap: 8px; padding: 20px 0; justify-content: center; color: #64748b; font-size: 12px;">
          <div class="paarth-spinner"></div>
          <span>Analyzing with Gemini AI...</span>
        </div>
      </div>
    `;

    root.appendChild(popup);
    activePopup = popup;

    // Close button event
    popup.querySelector('#paarth-close').addEventListener('click', () => removePopup());

    // Language toggle events
    const btnHi = popup.querySelector('#toggle-hi');
    const btnMr = popup.querySelector('#toggle-mr');

    btnHi.addEventListener('click', () => {
      selectedLang = 'Hindi';
      btnHi.classList.add('active');
      btnMr.classList.remove('active');
      fetchAndRender(text, 'Hindi');
    });

    btnMr.addEventListener('click', () => {
      selectedLang = 'Marathi';
      btnMr.classList.add('active');
      btnHi.classList.remove('active');
      fetchAndRender(text, 'Marathi');
    });

    // Fetch meaning from background worker
    fetchAndRender(text, selectedLang);
  }

  // Fetch from Background Service Worker
  function fetchAndRender(text, targetLang) {
    if (!activePopup) return;
    const contentArea = activePopup.querySelector('#paarth-content');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; padding: 20px 0; justify-content: center; color: #64748b; font-size: 12px;">
        <div class="paarth-spinner"></div>
        <span>Analyzing with Gemini AI...</span>
      </div>
    `;

    chrome.runtime.sendMessage(
      { type: 'PAARTH_ANALYZE_TEXT', text, targetLang },
      (response) => {
        if (!activePopup) return;

        let wordData = null;
        if (response?.data?.detectedWords && response.data.detectedWords.length > 0) {
          wordData = response.data.detectedWords[0];
        } else if (response?.data?.term) {
          wordData = response.data;
        } else {
          wordData = {
            term: text.slice(0, 30),
            partOfSpeech: 'Phrase / Selection',
            englishMeaning: 'Selected passage analyzed in context.',
            hindiMeaning: text,
            marathiMeaning: text
          };
        }

        const primaryTranslation = targetLang === 'Marathi' 
          ? (wordData.marathiMeaning || wordData.hindiMeaning || 'अनुवाद उपलब्ध')
          : (wordData.hindiMeaning || 'अनुवाद उपलब्ध');

        contentArea.innerHTML = `
          <div class="paarth-term-row">
            <span class="paarth-term">${wordData.term || text}</span>
            <button class="paarth-audio-btn" id="paarth-audio">
              🔊 Pronounce
            </button>
          </div>

          ${wordData.phonetic ? `<div class="paarth-phonetic">${wordData.phonetic}</div>` : ''}

          <div class="paarth-meaning-box">
            <div class="paarth-meaning-label">${targetLang} Meaning</div>
            <div class="paarth-meaning-text">${primaryTranslation}</div>
          </div>

          ${wordData.englishMeaning ? `
            <div class="paarth-definition">
              <strong>English Context:</strong> ${wordData.englishMeaning}
            </div>
          ` : ''}

          ${wordData.example ? `
            <div style="font-size: 10.5px; color: #64748b; font-style: italic; margin-top: 4px;">
              "${wordData.example}"
            </div>
          ` : ''}
        `;

        // Render Action Footer
        let footer = activePopup.querySelector('.paarth-footer-actions');
        if (!footer) {
          footer = document.createElement('div');
          footer.className = 'paarth-footer-actions';
          activePopup.appendChild(footer);
        }

        footer.innerHTML = `
          <button class="paarth-btn paarth-btn-secondary" id="paarth-save-btn">
            ★ Save Word
          </button>
          <button class="paarth-btn paarth-btn-primary" id="paarth-open-reader-btn">
            Open in Dual Reader →
          </button>
        `;

        // Pronunciation button
        contentArea.querySelector('#paarth-audio')?.addEventListener('click', () => {
          playSpeech(wordData.term || text, /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US');
        });

        // Save Word action
        footer.querySelector('#paarth-save-btn')?.addEventListener('click', (e) => {
          const btn = e.target;
          btn.textContent = '✓ Saved!';
          btn.style.color = '#15803d';
          chrome.storage.local.get(['paarth_saved_words'], (res) => {
            const list = res.paarth_saved_words || [];
            list.unshift({
              id: `ext-${Date.now()}`,
              word: wordData.term || text,
              translation: primaryTranslation,
              definition: wordData.englishMeaning || 'Saved from Chrome Extension',
              dateAdded: new Date().toISOString().split('T')[0]
            });
            chrome.storage.local.set({ paarth_saved_words: list });
          });
        });

        // Open in Dual Reader action
        footer.querySelector('#paarth-open-reader-btn')?.addEventListener('click', () => {
          const pageTitle = document.title ? document.title.slice(0, 40) : 'Web Article';
          const readerUrl = `http://localhost:5173/?page=reader&importText=${encodeURIComponent(text)}&title=${encodeURIComponent(pageTitle)}`;
          window.open(readerUrl, '_blank');
          removePopup();
        });
      }
    );
  }

  // Handle selection detection
  function checkSelection(e) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      removeFloatingBtn();
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 2 && text.length <= 2500) {
      try {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        // The last rect is the exact bounding box of the final selected line
        const lastRect = rects && rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

        let targetX = lastRect.right;
        let targetY = lastRect.bottom;

        // If mouse release point is near the selection, use it for fluid UX
        if (lastMousePos.x > 0 && Math.abs(lastMousePos.y - targetY) < 70) {
          targetX = lastMousePos.x;
          targetY = lastMousePos.y;
        }

        showFloatingButton(targetX, targetY, text);
      } catch (err) {
        console.warn('Paarth selection rect warning:', err);
      }
    } else {
      removeFloatingBtn();
    }
  }

  // Capture mouseup & pointerup with capture: true
  let selectionTimer = null;
  const onSelectionEnd = (e) => {
    isSelecting = false;
    if (e && e.clientX && e.clientY) {
      lastMousePos.x = e.clientX;
      lastMousePos.y = e.clientY;
    }
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => checkSelection(e), 60);
  };

  window.addEventListener('mouseup', onSelectionEnd, { capture: true, passive: true });
  document.addEventListener('mouseup', onSelectionEnd, { capture: true, passive: true });
  window.addEventListener('pointerup', onSelectionEnd, { capture: true, passive: true });

  // Native DOM selectionchange listener (fires whenever user finishes highlighting)
  document.addEventListener('selectionchange', () => {
    if (!isSelecting) {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => checkSelection(), 120);
    }
  });

  // Handle keyboard selection (e.g. Shift + Arrow keys)
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey) {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(checkSelection, 60);
    }
  });

  // Listen for context menu triggers from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PAARTH_TRIGGER_EXPLANATION') {
      const text = message.text || (window.getSelection() ? window.getSelection().toString().trim() : '');
      if (text) {
        let x = window.innerWidth / 2 - 160;
        let y = 100;
        try {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            x = rect.left;
            y = rect.bottom + 8;
          }
        } catch (e) {}
        showPaarthPopup(x, y, text);
      }
    }
  });

})();
