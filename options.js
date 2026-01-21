// Unchained Vibes - Settings

const DEFAULT_TRIGGER = 'send it';

const triggerPhraseInput = document.getElementById('triggerPhrase');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Save button
saveBtn.addEventListener('click', saveSettings);

// Reset button
resetBtn.addEventListener('click', resetSettings);

function loadSettings() {
  chrome.storage.local.get({ triggerPhrase: DEFAULT_TRIGGER }, (result) => {
    triggerPhraseInput.value = result.triggerPhrase;
    console.log('Loaded:', result.triggerPhrase);
  });
}

function saveSettings() {
  const triggerPhrase = triggerPhraseInput.value.trim().toLowerCase();
  
  if (!triggerPhrase) {
    showStatus('Trigger phrase cannot be empty!', 'error');
    return;
  }
  
  if (triggerPhrase.length < 2) {
    showStatus('Trigger phrase too short!', 'error');
    return;
  }
  
  chrome.storage.local.set({ triggerPhrase }, () => {
    console.log('Saved:', triggerPhrase);
    showStatus('Saved!', 'success');
    
    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'reloadSettings' }, () => {
          if (chrome.runtime.lastError) { /* ignore */ }
        });
      });
    });
  });
}

function resetSettings() {
  triggerPhraseInput.value = DEFAULT_TRIGGER;
  chrome.storage.local.set({ triggerPhrase: DEFAULT_TRIGGER }, () => {
    showStatus('Reset to default!', 'success');
  });
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 2000);
}
