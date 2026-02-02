const SYSTEM_PROMPT = `You are a supportive but direct coach helping someone quit nicotine, alcohol, and pornography. They're having a craving or struggling right now.

Your style:
- Be real, not preachy
- Acknowledge that this is genuinely hard
- Give practical, immediate actions they can take RIGHT NOW
- Remind them why they're doing this without lecturing
- Keep responses short and punchy - 2-4 paragraphs max
- No toxic positivity - validate the struggle while encouraging them
- Be like a tough but caring friend, not a therapist

Key things to remember:
- Cravings peak and pass in 15-20 minutes
- They built an entire Chrome extension to help themselves quit - remind them of that strength
- "Playing the tape forward" helps - think about the shame AFTER relapsing
- Physical action helps: cold water, pushups, walk outside, cold shower
- One slip doesn't have to become a full relapse
- The addiction is lying to them - "just one" is never just one

Never say things like:
- "I'm just an AI"
- "You should seek professional help" (unless they mention self-harm)
- Long paragraphs of generic advice
- Anything preachy or condescending`;

let conversationHistory = [];
let apiKey = '';

// Load API key
chrome.storage.sync.get(['claudeApiKey'], (result) => {
  if (result.claudeApiKey) {
    apiKey = result.claudeApiKey;
  }
});

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const errorMsg = document.getElementById('errorMsg');

// Auto-resize textarea
userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

// Send message
async function sendMessage(text) {
  if (!text.trim()) return;
  if (!apiKey) {
    showError('API key not set. Go to extension settings to add your Claude API key.');
    return;
  }

  // Add user message to UI
  addMessage('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';

  // Add to history
  conversationHistory.push({ role: 'user', content: text });

  // Show typing indicator
  const typingDiv = addMessage('assistant', 'Thinking...', true);

  // Disable input while waiting
  sendBtn.disabled = true;
  userInput.disabled = true;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: conversationHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    // Remove typing indicator and add real response
    typingDiv.remove();
    addMessage('assistant', assistantMessage);

    // Add to history
    conversationHistory.push({ role: 'assistant', content: assistantMessage });

    hideError();

  } catch (error) {
    typingDiv.remove();
    showError('Error: ' + error.message);
    // Remove the failed user message from history
    conversationHistory.pop();
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

function addMessage(role, content, isTyping = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}${isTyping ? ' typing' : ''}`;

  const labelDiv = document.createElement('div');
  labelDiv.className = 'message-label';
  labelDiv.textContent = role === 'user' ? 'You' : 'Support';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = content.replace(/\n/g, '<br>');

  messageDiv.appendChild(labelDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageDiv;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

function hideError() {
  errorMsg.style.display = 'none';
}

// Event listeners
sendBtn.addEventListener('click', () => sendMessage(userInput.value));

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(userInput.value);
  }
});

// Quick buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendMessage(btn.dataset.msg);
  });
});

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});

// Focus input on load
userInput.focus();
