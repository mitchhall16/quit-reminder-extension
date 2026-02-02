// Tab switching
document.querySelectorAll('.recipe-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active from all tabs and cards
    document.querySelectorAll('.recipe-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('active'));

    // Add active to clicked tab and corresponding card
    tab.classList.add('active');
    const recipeId = tab.dataset.recipe;
    document.getElementById(recipeId).classList.add('active');
  });
});

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});

// Open AI Recipe Chat
document.getElementById('openAiChatBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('recipe-chat.html') });
});

// Load and display saved recipes
let savedRecipes = [];

function loadSavedRecipes() {
  chrome.storage.local.get(['savedRecipes'], (result) => {
    savedRecipes = result.savedRecipes || [];
    renderSavedRecipes();
  });
}

function renderSavedRecipes() {
  const container = document.getElementById('savedRecipesList');
  const noRecipes = document.getElementById('noSavedRecipes');
  const countEl = document.getElementById('savedCount');

  countEl.textContent = savedRecipes.length;

  if (savedRecipes.length === 0) {
    noRecipes.style.display = 'block';
    container.innerHTML = '';
    return;
  }

  noRecipes.style.display = 'none';

  container.innerHTML = savedRecipes.map(recipe => `
    <div class="saved-recipe-item" data-id="${recipe.id}">
      <button class="delete-saved-btn" data-id="${recipe.id}">&times;</button>
      <div class="saved-recipe-title">${recipe.title}</div>

      ${recipe.ingredients && recipe.ingredients.length > 0 ? `
        <div class="saved-recipe-section">
          <h4>Ingredients</h4>
          <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${recipe.steps && recipe.steps.length > 0 ? `
        <div class="saved-recipe-section">
          <h4>Steps</h4>
          <ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>
      ` : ''}

      ${recipe.macros && Object.keys(recipe.macros).length > 0 ? `
        <div class="saved-recipe-macros">
          ${Object.entries(recipe.macros).map(([key, value]) => `
            <div class="saved-macro">
              <span class="saved-macro-label">${key}:</span>
              <span class="saved-macro-value">${value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${recipe.tips && recipe.tips.length > 0 ? `
        <div class="saved-recipe-section">
          <h4>Tips</h4>
          <ul>${recipe.tips.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Add delete handlers
  container.querySelectorAll('.delete-saved-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('Delete this recipe?')) {
        savedRecipes = savedRecipes.filter(r => r.id !== id);
        chrome.storage.local.set({ savedRecipes: savedRecipes }, () => {
          renderSavedRecipes();
        });
      }
    });
  });
}

// Load saved recipes on page load
loadSavedRecipes();

// Refresh saved recipes when switching to that tab
document.querySelector('[data-recipe="my-saved"]').addEventListener('click', () => {
  loadSavedRecipes();
});
