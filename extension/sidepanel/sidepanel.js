// Paarth Side Panel Script

document.addEventListener('DOMContentLoaded', () => {
  const btnSync = document.getElementById('btn-sync-selection');
  const card = document.getElementById('inspector-card');
  const termEl = document.getElementById('inspect-term');
  const hiEl = document.getElementById('inspect-hi');
  const mrEl = document.getElementById('inspect-mr');
  const defEl = document.getElementById('inspect-def');
  const audioBtn = document.getElementById('inspect-audio');
  const openReaderBtn = document.getElementById('btn-open-in-reader');

  let currentSelectedText = '';

  btnSync.addEventListener('click', async () => {
    btnSync.disabled = true;
    btnSync.textContent = 'Reading current tab...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        btnSync.disabled = false;
        btnSync.textContent = 'Inspect Selected Text on Page';
        return;
      }

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      if (!result || !result.trim()) {
        btnSync.textContent = '⚠️ Highlight text on page first!';
        setTimeout(() => {
          btnSync.disabled = false;
          btnSync.textContent = 'Inspect Selected Text on Page';
        }, 2000);
        return;
      }

      currentSelectedText = result.trim();
      btnSync.textContent = 'Analyzing with Gemini AI...';

      chrome.runtime.sendMessage(
        { type: 'PAARTH_ANALYZE_TEXT', text: currentSelectedText, targetLang: 'Hindi' },
        (res) => {
          btnSync.disabled = false;
          btnSync.textContent = 'Inspect Selected Text on Page';

          const word = res?.data?.detectedWords?.[0] || res?.data;
          if (word) {
            termEl.textContent = word.term || currentSelectedText;
            hiEl.textContent = word.hindiMeaning || 'अनुवाद उपलब्ध';
            mrEl.textContent = word.marathiMeaning || word.hindiMeaning || 'अनुवाद उपलब्ध';
            defEl.textContent = word.englishMeaning || word.definition || 'Analyzed in context.';
            card.style.display = 'block';

            audioBtn.onclick = () => {
              if (!('speechSynthesis' in window)) return;
              window.speechSynthesis.cancel();
              if (window.speechSynthesis.paused) window.speechSynthesis.resume();

              const wordToSpeak = (word.term || currentSelectedText).trim();
              const isDev = /[\u0900-\u097F]/.test(wordToSpeak);
              const utter = new SpeechSynthesisUtterance(wordToSpeak);
              utter.lang = isDev ? 'hi-IN' : 'en-US';
              utter.volume = 1.0;
              utter.rate = isDev ? 0.92 : 0.96;
              utter.pitch = 1.0;

              const voices = window.speechSynthesis.getVoices() || [];
              if (isDev) {
                const devVoice = voices.find(v => v.name.toLowerCase().includes('lekha') || v.name.includes('हिन्दी') || v.lang.startsWith('hi'));
                if (devVoice) utter.voice = devVoice;
              } else {
                const enVoice = voices.find(v => v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google us english') || v.name.toLowerCase().includes('alex'));
                if (enVoice) utter.voice = enVoice;
              }

              window._spActiveUtterance = utter;
              utter.onend = () => { window._spActiveUtterance = null; };
              utter.onerror = () => { window._spActiveUtterance = null; };

              setTimeout(() => window.speechSynthesis.speak(utter), 15);
            };

            openReaderBtn.onclick = () => {
              const readerUrl = `http://localhost:5173/?page=reader&importText=${encodeURIComponent(currentSelectedText)}&title=${encodeURIComponent('Web Article')}`;
              chrome.tabs.create({ url: readerUrl });
            };
          }
        }
      );
    } catch (err) {
      console.warn('Could not inspect tab:', err);
      btnSync.disabled = false;
      btnSync.textContent = 'Inspect Selected Text on Page';
    }
  });
});
