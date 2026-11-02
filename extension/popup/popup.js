// Paarth Extension - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const textInput = document.getElementById('text-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnGrabTab = document.getElementById('btn-grab-tab');
  const btnOpenFullApp = document.getElementById('btn-open-full-app');
  const btnOpenSidePanel = document.getElementById('btn-open-sidepanel');
  const resultBox = document.getElementById('result-box');
  const resTerm = document.getElementById('res-term');
  const resTrans = document.getElementById('res-trans');
  const resDesc = document.getElementById('res-desc');
  const resAudio = document.getElementById('res-audio');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  let currentTargetLang = 'Hindi';

  // Check Backend Status
  chrome.runtime.sendMessage({ type: 'CHECK_BACKEND_STATUS' }, (res) => {
    if (res?.online) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Backend Online';
      statusText.style.color = '#15803d';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Offline (Cache)';
      statusText.style.color = '#64748b';
    }
  });

  // Language buttons toggle
  const langBtns = document.querySelectorAll('.lang-btn');
  langBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      langBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTargetLang = btn.dataset.lang;
    });
  });

  // Grab text from current active tab
  btnGrabTab.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      if (result && result.trim()) {
        textInput.value = result.trim();
        triggerAnalysis(result.trim());
      } else {
        btnGrabTab.textContent = '⚠️ No text selected on page';
        setTimeout(() => {
          btnGrabTab.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>Analyze Selected Text on Current Tab</span>
          `;
        }, 2000);
      }
    } catch (err) {
      console.warn('Could not read from tab:', err);
    }
  });

  // Trigger Analysis
  async function triggerAnalysis(text) {
    if (!text || !text.trim()) return;

    btnAnalyze.disabled = true;
    btnAnalyze.textContent = 'Analyzing with Gemini AI...';
    resultBox.style.display = 'none';

    chrome.runtime.sendMessage(
      { type: 'PAARTH_ANALYZE_TEXT', text, targetLang: currentTargetLang },
      (response) => {
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = 'Explain & Translate →';

        if (response?.data) {
          const word = response.data.detectedWords?.[0] || response.data;
          resTerm.textContent = word.term || text;
          resTrans.textContent = (currentTargetLang === 'Marathi' ? (word.marathiMeaning || word.hindiMeaning) : word.hindiMeaning) || 'अनुवाद उपलब्ध';
          resDesc.textContent = word.englishMeaning || word.definition || 'Analyzed in reading context.';
          resultBox.style.display = 'block';

          // High-audibility audio playback
          resAudio.onclick = () => {
            if (!('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();

            const wordToSpeak = (word.term || text).trim();
            const isDev = /[\u0900-\u097F]/.test(wordToSpeak);
            const utterance = new SpeechSynthesisUtterance(wordToSpeak);
            utterance.lang = isDev ? 'hi-IN' : 'en-US';
            utterance.volume = 1.0;
            utterance.rate = isDev ? 0.92 : 0.96;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices() || [];
            if (isDev) {
              const devVoice = voices.find(v => v.name.toLowerCase().includes('lekha') || v.name.includes('हिन्दी') || v.lang.startsWith('hi'));
              if (devVoice) utterance.voice = devVoice;
            } else {
              const enVoice = voices.find(v => v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google us english') || v.name.toLowerCase().includes('alex'));
              if (enVoice) utterance.voice = enVoice;
            }

            window._extActiveUtterance = utterance;
            utterance.onend = () => { window._extActiveUtterance = null; };
            utterance.onerror = () => { window._extActiveUtterance = null; };

            setTimeout(() => window.speechSynthesis.speak(utterance), 15);
          };
        }
      }
    );
  }

  // Click Analyze Button
  btnAnalyze.addEventListener('click', () => {
    triggerAnalysis(textInput.value);
  });

  // Open Full App
  btnOpenFullApp.addEventListener('click', () => {
    const text = textInput.value.trim();
    let url = 'http://localhost:5173';
    if (text) {
      url += `/?page=reader&importText=${encodeURIComponent(text)}&title=${encodeURIComponent('Quick Import')}`;
    }
    chrome.tabs.create({ url });
  });

  // Open Side Panel
  btnOpenSidePanel.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  });
});
