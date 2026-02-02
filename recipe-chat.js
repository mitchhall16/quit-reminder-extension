// Recipe Chat with Claude Haiku

let apiKey = null;
let savedRecipes = [];
let chatHistory = [];

// System prompt for the recipe assistant
const SYSTEM_PROMPT = `You are a helpful recipe and nutrition assistant. You help users with:
- Creating healthy, simple recipes
- Meal planning and prep ideas
- Nutrition advice for recovery and wellness
- Quick and easy cooking tips

When providing a recipe, ALWAYS format it like this:
[RECIPE_START]
Title: Recipe Name
Ingredients:
- ingredient 1
- ingredient 2
Steps:
1. Step one
2. Step two
Macros:
- Protein: Xg
- Calories: X
- Carbs: Xg
- Fat: Xg
Tips:
- Any helpful tips
[RECIPE_END]

Keep recipes simple and practical. Focus on high-protein, nutrient-dense options that support recovery and wellness. Be encouraging and supportive.`;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  loadSavedRecipes();
  setupEventListeners();
});

function loadApiKey() {
  chrome.storage.sync.get(['claudeApiKey'], (result) => {
    apiKey = result.claudeApiKey;
    if (!apiKey) {
      document.getElementById('apiWarning').style.display = 'block';
      document.getElementById('chatInput').disabled = true;
      document.getElementById('sendBtn').disabled = true;
    }
  });
}

function loadSavedRecipes() {
  chrome.storage.local.get(['savedRecipes'], (result) => {
    savedRecipes = result.savedRecipes || [];
    renderSavedRecipes();
  });
}

function saveSavedRecipes() {
  chrome.storage.local.set({ savedRecipes: savedRecipes });
}

function setupEventListeners() {
  // View Cooking Guide button
  document.getElementById('viewCookingGuideBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('cooking-guide.html') });
  });

  // Close button
  document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
  });

  // Settings link
  document.getElementById('openSettingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() :
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  });

  // Send message
  document.getElementById('sendBtn').addEventListener('click', sendMessage);

  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  document.getElementById('chatInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
  });

  // Quick prompts
  document.querySelectorAll('.quick-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('chatInput').value = btn.dataset.prompt;
      sendMessage();
    });
  });
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message || !apiKey) return;

  // Add user message to chat
  addMessageToChat('user', message);
  input.value = '';
  input.style.height = 'auto';

  // Hide quick prompts after first message
  document.getElementById('quickPrompts').style.display = 'none';

  // Show typing indicator
  document.getElementById('typingIndicator').style.display = 'block';
  scrollToBottom();

  // Add to history
  chatHistory.push({ role: 'user', content: message });

  try {
    const response = await callClaudeAPI(message);

    // Hide typing indicator
    document.getElementById('typingIndicator').style.display = 'none';

    // Add assistant message
    addMessageToChat('assistant', response, true);

    // Add to history
    chatHistory.push({ role: 'assistant', content: response });

  } catch (error) {
    document.getElementById('typingIndicator').style.display = 'none';
    addMessageToChat('assistant', `Sorry, there was an error: ${error.message}. Please check your API key in settings.`);
  }
}

async function callClaudeAPI(message) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [...chatHistory, { role: 'user', content: message }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.content[0].text;
}

function addMessageToChat(role, content, parseRecipe = false) {
  const messagesContainer = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const senderDiv = document.createElement('div');
  senderDiv.className = 'message-sender';
  senderDiv.textContent = role === 'user' ? 'You' : 'Recipe Assistant';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';

  // Check for recipe in the content
  if (parseRecipe && content.includes('[RECIPE_START]')) {
    const { textContent, recipes } = parseRecipeFromContent(content);
    bubbleDiv.innerHTML = formatMessage(textContent);

    recipes.forEach(recipe => {
      const recipeCard = createRecipeCard(recipe);
      bubbleDiv.appendChild(recipeCard);
    });
  } else {
    bubbleDiv.innerHTML = formatMessage(content);
  }

  messageDiv.appendChild(senderDiv);
  messageDiv.appendChild(bubbleDiv);
  messagesContainer.appendChild(messageDiv);

  scrollToBottom();
}

function formatMessage(text) {
  // Basic markdown-ish formatting
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function parseRecipeFromContent(content) {
  const recipes = [];
  let textContent = content;

  const recipeRegex = /\[RECIPE_START\]([\s\S]*?)\[RECIPE_END\]/g;
  let match;

  while ((match = recipeRegex.exec(content)) !== null) {
    const recipeText = match[1];
    const recipe = parseRecipe(recipeText);
    if (recipe) {
      recipes.push(recipe);
    }
    textContent = textContent.replace(match[0], '');
  }

  return { textContent: textContent.trim(), recipes };
}

function parseRecipe(recipeText) {
  const recipe = {
    id: Date.now().toString(),
    title: '',
    ingredients: [],
    steps: [],
    macros: {},
    tips: [],
    savedAt: new Date().toISOString()
  };

  const lines = recipeText.split('\n').map(l => l.trim()).filter(l => l);
  let currentSection = null;

  lines.forEach(line => {
    if (line.startsWith('Title:')) {
      recipe.title = line.replace('Title:', '').trim();
    } else if (line === 'Ingredients:') {
      currentSection = 'ingredients';
    } else if (line === 'Steps:') {
      currentSection = 'steps';
    } else if (line === 'Macros:') {
      currentSection = 'macros';
    } else if (line === 'Tips:') {
      currentSection = 'tips';
    } else if (line.startsWith('-') || line.match(/^\d+\./)) {
      const content = line.replace(/^[-\d.]+\s*/, '').trim();
      if (currentSection === 'ingredients') {
        recipe.ingredients.push(content);
      } else if (currentSection === 'steps') {
        recipe.steps.push(content);
      } else if (currentSection === 'macros') {
        const [key, value] = content.split(':').map(s => s.trim());
        if (key && value) {
          recipe.macros[key.toLowerCase()] = value;
        }
      } else if (currentSection === 'tips') {
        recipe.tips.push(content);
      }
    }
  });

  return recipe.title ? recipe : null;
}

function createRecipeCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';
  card.dataset.recipeId = recipe.id;

  let html = `<div class="recipe-title">${recipe.title}</div>`;

  if (recipe.ingredients.length > 0) {
    html += `
      <div class="recipe-section">
        <h4>Ingredients</h4>
        <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
    `;
  }

  if (recipe.steps.length > 0) {
    html += `
      <div class="recipe-section">
        <h4>Steps</h4>
        <ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>
    `;
  }

  if (Object.keys(recipe.macros).length > 0) {
    html += `
      <div class="recipe-macros">
        ${Object.entries(recipe.macros).map(([key, value]) => `
          <div class="macro-item">
            <span class="macro-label">${key}:</span>
            <span class="macro-value">${value}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (recipe.tips.length > 0) {
    html += `
      <div class="recipe-section">
        <h4>Tips</h4>
        <ul>${recipe.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
    `;
  }

  // Check if already saved
  const isSaved = savedRecipes.some(r => r.title === recipe.title);

  html += `
    <button class="save-recipe-btn ${isSaved ? 'saved' : ''}" data-recipe='${JSON.stringify(recipe)}'>
      ${isSaved ? 'Saved!' : 'Save to My Recipes'}
    </button>
  `;

  card.innerHTML = html;

  // Add save button listener
  const saveBtn = card.querySelector('.save-recipe-btn');
  if (!isSaved) {
    saveBtn.addEventListener('click', () => saveRecipe(recipe, saveBtn));
  }

  return card;
}

function saveRecipe(recipe, button) {
  // Check if already saved
  if (savedRecipes.some(r => r.title === recipe.title)) {
    return;
  }

  savedRecipes.push(recipe);
  saveSavedRecipes();

  button.textContent = 'Saved!';
  button.classList.add('saved');

  // Show confirmation with link to cooking guide
  showToast(`"${recipe.title}" saved! View in Cooking Guide → My Saved Recipes`);
}


function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(74, 222, 128, 0.95);
    color: #000;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
