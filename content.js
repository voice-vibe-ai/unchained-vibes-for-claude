// Unchained Vibes - Voice Input for Claude
// Pure voice input - Enter to send

console.log('Unchained Vibes - Loaded');

// === STATE ===
let micActive = false;
let isProcessing = false;
let triggerDetected = false;
let recognition = null;
let silenceTimer = null;

// Settings (loaded from storage)
let triggerPhrase = 'send it';

// UI positions
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let groupLeft = 20;
let groupBottom = 55;

// === GLASS PANEL CONTAINER ===
function createGlassPanel() {
  const panel = document.createElement('div');
  panel.id = 'vf-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: ${groupBottom}px;
    left: ${groupLeft}px;
    width: 50px;
    padding: 8px 0;
    border-radius: 14px;
    background: rgba(40, 40, 40, 0.85);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 999999;
    user-select: none;
    cursor: grab;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  `;
  panel.addEventListener('mousedown', startDrag);
  document.body.appendChild(panel);
  return panel;
}

// === LOGO TEXT ===
function createLogoText() {
  const logo = document.createElement('div');
  logo.id = 'vf-logo';
  logo.innerHTML = `
    <div style="text-align: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.15); margin-bottom: 8px;">
      <div style="font-size: 8px; font-weight: 600; color: #fff; line-height: 1.2;">Unchained</div>
      <div style="font-size: 10px; font-weight: 600; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.2;">Vibes</div>
    </div>
  `;
  return logo;
}

// === MIC BUTTON ===
function createMicButton() {
  const mic = document.createElement('div');
  mic.id = 'vf-mic';
  mic.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';
  mic.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #666;
    color: white;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  `;
  mic.addEventListener('click', toggleMic);
  mic.addEventListener('mouseenter', () => mic.style.transform = 'scale(1.05)');
  mic.addEventListener('mouseleave', () => mic.style.transform = 'scale(1)');
  return mic;
}

// === TOGGLE MIC ===
function toggleMic() {
  const mic = document.getElementById('vf-mic');
  if (!mic) return;
  
  if (!micActive) {
    micActive = true;
    mic.style.background = '#d32f2f';
    startListening();
    console.log('Mic ON');
  } else {
    micActive = false;
    isProcessing = false;
    triggerDetected = false;
    mic.style.background = '#666';
    stopListening();
    console.log('Mic OFF');
  }
}

// === DRAG FUNCTIONS ===
let dragMoved = false;
function startDrag(e) {
  isDragging = false;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
}

function onDrag(e) {
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    isDragging = true;
    dragMoved = true;
    groupLeft += deltaX;
    groupBottom -= deltaY;
    updatePanelPosition();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }
}

function stopDrag(e) {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  if (dragMoved) {
    setTimeout(() => { isDragging = false; }, 100);
  } else {
    isDragging = false;
  }
}

function updatePanelPosition() {
  const panel = document.getElementById('vf-panel');
  if (panel) {
    panel.style.left = `${groupLeft}px`;
    panel.style.bottom = `${groupBottom}px`;
  }
}

// === ENTER KEY LISTENER ===
function setupEnterKeyListener() {
  document.addEventListener('keydown', (e) => {
    // Only intercept Enter when mic is active and not processing
    if (!micActive || isProcessing) return;
    
    // Plain Enter key (no modifiers)
    if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      console.log('ENTER pressed');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (!triggerDetected) {
        triggerDetected = true;
        handleTrigger();
      }
    }
  }, true); // Use capture phase
  console.log('Enter key listener ready');
}

// === TEXT INSERTION ===
function insertTextAtCursor(text) {
  if (!micActive || !text || !text.trim()) return;
  
  const textarea = document.querySelector('[contenteditable="true"]');
  if (!textarea) return;
  
  if (document.activeElement !== textarea) {
    textarea.focus();
  }
  
  document.execCommand('insertText', false, text);
  console.log('Inserted:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
}

// === SPEECH RECOGNITION ===
function initRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Speech recognition not supported. Use Chrome or Edge.');
    return;
  }
  
  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    console.log('Listening started');
    resetSilenceTimer();
  };
  
  recognition.onresult = (event) => {
    // Reset silence timer on any speech
    resetSilenceTimer();
    
    // Use resultIndex to only process NEW results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        let transcript = event.results[i][0].transcript;
        
        if (!transcript || !transcript.trim()) continue;
        
        console.log('Transcript:', transcript);
        
        // Check for trigger phrase
        if (!triggerDetected && transcript.toLowerCase().includes(triggerPhrase.toLowerCase())) {
          console.log('TRIGGER!', triggerPhrase);
          triggerDetected = true;
          
          // Remove trigger phrase from text
          const regex = new RegExp(triggerPhrase, 'gi');
          transcript = transcript.replace(regex, '').trim();
          
          // Insert any remaining text
          if (transcript) {
            insertTextAtCursor(transcript + ' ');
          }
          
          handleTrigger();
          return;
        }
        
        // Normal speech - just insert it
        insertTextAtCursor(transcript + ' ');
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.log('Recognition error:', event.error);
    clearSilenceTimer();
    
    if (event.error === 'no-speech') {
      // Normal timeout, just restart if still active
      if (micActive && !isProcessing) {
        setTimeout(startListening, 100);
      }
      return;
    }
    
    if (event.error === 'network') {
      // Network issue, wait longer before retry
      if (micActive && !isProcessing) {
        setTimeout(startListening, 2000);
      }
    }
  };
  
  recognition.onend = () => {
    console.log('Recognition ended');
    clearSilenceTimer();
    
    // Auto-restart if still active
    if (micActive && !isProcessing) {
      setTimeout(startListening, 300);
    }
  };
}

function resetSilenceTimer() {
  clearSilenceTimer();
  silenceTimer = setTimeout(() => {
    if (micActive && !isProcessing) {
      console.log('Silence timeout - restarting');
      try { recognition.stop(); } catch (e) {}
    }
  }, 15000);
}

function clearSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

function startListening() {
  if (!recognition) return;
  
  try {
    recognition.start();
  } catch (e) {
    console.log('Start error (usually harmless):', e.message);
  }
}

function stopListening() {
  if (!recognition) return;
  
  clearSilenceTimer();
  
  try {
    recognition.stop();
    recognition.abort();
  } catch (e) {
    // Not running - ignore
  }
}

// === TRIGGER HANDLER ===
async function handleTrigger() {
  console.log('Trigger activated');
  isProcessing = true;
  
  const textarea = document.querySelector('[contenteditable="true"]');
  if (!textarea) {
    console.error('No textarea found');
    resetAfterTrigger();
    return;
  }
  
  // Get text and clean up trigger phrase
  let fullText = textarea.textContent || '';
  const regex = new RegExp(triggerPhrase, 'gi');
  fullText = fullText.replace(regex, '').trim();
  
  // Clear textarea
  textarea.innerHTML = '';
  
  if (!fullText) {
    console.log('No text to send');
    resetAfterTrigger();
    return;
  }
  
  console.log('Sending:', fullText);
  await submitMessage(fullText);
  
  // Aggressive clear to prevent echo
  let clearAttempts = 0;
  const aggressiveClear = setInterval(() => {
    const ta = document.querySelector('[contenteditable="true"]');
    if (ta) {
      ta.innerHTML = '';
      ta.textContent = '';
    }
    clearAttempts++;
    if (clearAttempts >= 10) {
      clearInterval(aggressiveClear);
    }
  }, 100);
  
  // Wait briefly for message to send, then reset
  setTimeout(() => {
    resetAfterTrigger();
  }, 1500);
}

function resetAfterTrigger() {
  isProcessing = false;
  triggerDetected = false;
  
  // Mic stays red, keep listening
  if (micActive) {
    startListening();
    console.log('Ready for next input');
  }
}

// === SUBMIT MESSAGE ===
async function submitMessage(text) {
  try {
    const textarea = document.querySelector('[contenteditable="true"]');
    if (!textarea) return;
    
    textarea.innerHTML = '';
    textarea.focus();
    textarea.textContent = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    await sleep(200);
    
    const sendBtn = document.querySelector('button[aria-label*="Send"]') || 
                    document.querySelector('button[type="submit"]');
    if (!sendBtn) return;
    
    sendBtn.click();
    console.log('Message sent');
    
    // Clear after send
    await sleep(300);
    textarea.innerHTML = '';
    textarea.textContent = '';
  } catch (error) {
    console.error('Submit error:', error);
  }
}

// === UTILITY ===
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === SETTINGS ===
function loadSettings() {
  chrome.storage.local.get({
    triggerPhrase: 'send it'
  }, (result) => {
    triggerPhrase = result.triggerPhrase;
    console.log('Settings loaded:', { triggerPhrase });
  });
}

// === INIT ===
function init() {
  console.log('Unchained Vibes initializing');
  
  loadSettings();
  initRecognition();
  
  // Create panel - just logo and mic
  const panel = createGlassPanel();
  panel.appendChild(createLogoText());
  panel.appendChild(createMicButton());
  
  setupEnterKeyListener();
  
  // Listen for settings changes
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'reloadSettings') {
      loadSettings();
      console.log('Settings reloaded');
      sendResponse({ success: true });
    }
  });
  
  console.log('Unchained Vibes ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
