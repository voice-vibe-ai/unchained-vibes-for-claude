// Unchained Vibes - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Unchained Vibes installed!');
  
  // Set default trigger phrase
  chrome.storage.local.get(['triggerPhrase'], (result) => {
    if (!result.triggerPhrase) {
      chrome.storage.local.set({ triggerPhrase: 'send it' });
    }
  });
});
