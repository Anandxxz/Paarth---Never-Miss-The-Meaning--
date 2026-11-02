// Paarth Chrome Extension - Background Service Worker (Manifest V3)

const BACKEND_URL = 'http://localhost:5001';

// Fallback dictionary for instant responses even if local server is starting
const QUICK_DICTIONARY = {
  'magnificent': {
    term: 'Magnificent',
    phonetic: '/mæɡˈnɪf.ə.sənt/',
    partOfSpeech: 'Adjective',
    englishMeaning: 'Extremely impressive, elegant, or beautiful in appearance.',
    hindiMeaning: 'शानदार / भव्य',
    marathiMeaning: 'भव्य / देखणा',
    example: 'The palace looked magnificent under the starlight.'
  },
  'curiosity': {
    term: 'Curiosity',
    phonetic: '/ˌkjʊə.riˈɒs.ə.ti/',
    partOfSpeech: 'Noun',
    englishMeaning: 'A strong desire to know or learn something new.',
    hindiMeaning: 'जिज्ञासा / कौतूहल',
    marathiMeaning: 'उत्सुकता / जिज्ञासा',
    example: 'Scientific curiosity led to groundbreaking discoveries.'
  },
  'resilience': {
    term: 'Resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    partOfSpeech: 'Noun',
    englishMeaning: 'The capacity to withstand or recover quickly from difficulties.',
    hindiMeaning: 'लचीलापन / संभलने की शक्ति',
    marathiMeaning: 'स्थितीस्थापकत्व / संकटातून सावरण्याची ताकद',
    example: 'Cultivating cognitive resilience and deeper empathy.'
  }
};

// Create Context Menus on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'paarth-explain',
    title: 'Explain with Paarth ("%s")',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'paarth-open-reader',
    title: 'Open in Paarth Dual Reader',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'paarth-open-sidepanel',
    title: 'Open Paarth Side Panel',
    contexts: ['all']
  });
});

// Handle Context Menu Actions
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'paarth-explain' && tab?.id) {
    const text = (info.selectionText || '').trim();
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PAARTH_TRIGGER_EXPLANATION',
        text
      });
    } catch (err) {
      console.log('[Paarth Background] Auto-injecting content script into active tab:', tab.id);
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content/content.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'PAARTH_TRIGGER_EXPLANATION',
              text
            });
          } catch (e) {
            console.warn('[Paarth Background] Message retry error:', e);
          }
        }, 120);
      } catch (injectErr) {
        console.warn('Could not inject content script:', injectErr);
      }
    }
  } else if (info.menuItemId === 'paarth-open-reader') {
    const rawText = (info.selectionText || '').trim();
    const pageTitle = tab?.title ? tab.title.slice(0, 40) : 'Web Article';
    const readerUrl = `http://localhost:5173/?page=reader&importText=${encodeURIComponent(rawText)}&title=${encodeURIComponent(pageTitle)}`;
    await chrome.tabs.create({ url: readerUrl });
  } else if (info.menuItemId === 'paarth-open-sidepanel' && tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Runtime Message Passing Listener (async pattern adhering to MV3 guidelines)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAARTH_ANALYZE_TEXT') {
    (async () => {
      try {
        const text = (message.text || '').trim();
        const targetLang = message.targetLang || 'Hindi';

        // 1. Try local Paarth Backend first
        const isSingleWord = text.split(/\s+/).length <= 2;
        
        if (isSingleWord) {
          const lower = text.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
          if (QUICK_DICTIONARY[lower]) {
            sendResponse({ success: true, data: QUICK_DICTIONARY[lower], source: 'cache' });
            return;
          }
        }

        // Call backend /api/analyze or /api/translate
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${BACKEND_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article: text,
            level: 2,
            targetLanguage: targetLang
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          sendResponse({ success: true, data, source: 'gemini' });
        } else {
          throw new Error(`Server returned status ${res.status}`);
        }
      } catch (err) {
        // Fallback for single words or offline
        const text = (message.text || '').trim();
        const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
        sendResponse({
          success: true,
          data: {
            detectedWords: [
              {
                term: capitalized,
                partOfSpeech: 'Contextual Term',
                englishMeaning: `Meaning of "${capitalized}" in this reading context.`,
                hindiMeaning: `[${capitalized} का अनुवाद]`,
                marathiMeaning: `[${capitalized} चा अनुवाद]`,
                example: `Highlighted in: "${text.slice(0, 100)}..."`
              }
            ],
            offlineNotice: 'Paarth backend offline or loading. Start backend at http://localhost:5001 for live Gemini AI.'
          },
          source: 'fallback'
        });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    (async () => {
      const windowId = sender.tab?.windowId;
      if (windowId) {
        await chrome.sidePanel.open({ windowId });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === 'CHECK_BACKEND_STATUS') {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET' });
        const data = await res.json();
        sendResponse({ online: res.ok, data });
      } catch (e) {
        sendResponse({ online: false });
      }
    })();
    return true;
  }
});
