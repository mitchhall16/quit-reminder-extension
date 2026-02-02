const motivationalQuotes = [
  "The cravings are temporary. Your health is permanent.",
  "You're not giving something up. You're getting your life back.",
  "Every minute you resist makes you stronger.",
  "Your future self will thank you for this moment.",
  "Discomfort is temporary. Regret lasts forever.",
  "You've survived 100% of your worst days. You'll survive this craving too.",
  "The best time to quit was yesterday. The second best time is now.",
  "You're not depriving yourself. You're freeing yourself.",
  "This craving will pass whether you give in or not.",
  "Be stronger than your excuses."
];

let affirmation = "I don't need to drink. I don't need nicotine. I am stronger than my cravings.";
let nofapAffirmation = "";
let nofapEnabled = false;
let completed = false;
let nofapCompleted = false;

// Load settings and stats
chrome.storage.sync.get(['affirmation', 'startDate', 'timesCompleted', 'dailyCost', 'nofapEnabled', 'nofapAffirmation'], (result) => {
  if (result.affirmation) {
    affirmation = result.affirmation;
  }

  nofapEnabled = result.nofapEnabled || false;
  if (nofapEnabled && result.nofapAffirmation) {
    nofapAffirmation = result.nofapAffirmation;
  }

  // Build display text
  let displayText = affirmation;
  if (nofapEnabled && nofapAffirmation) {
    displayText += "\n\n" + nofapAffirmation;
  }
  document.getElementById('affirmationDisplay').textContent = displayText;
  document.getElementById('affirmationDisplay').style.whiteSpace = 'pre-wrap';

  // Calculate days clean
  if (result.startDate) {
    const start = new Date(result.startDate);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    document.getElementById('daysClean').textContent = days;

    // Estimate money saved (default $10/day if not set)
    const dailyCost = result.dailyCost || 10;
    const saved = days * dailyCost;
    document.getElementById('moneySaved').textContent = '$' + saved;
  }

  // Show times completed
  const times = result.timesCompleted || 0;
  document.getElementById('timesCompleted').textContent = times;
});

// Show random motivation quote
document.getElementById('motivationQuote').textContent =
  motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

// Check input
const input = document.getElementById('affirmationInput');
const indicator = document.getElementById('matchIndicator');

input.addEventListener('input', () => {
  const typed = input.value.trim().toLowerCase();

  // Build full target (both affirmations if nofap enabled)
  let fullTarget = affirmation.trim().toLowerCase();
  if (nofapEnabled && nofapAffirmation) {
    fullTarget += " " + nofapAffirmation.trim().toLowerCase();
  }

  if (typed === fullTarget) {
    // Success!
    completed = true;
    input.classList.remove('incorrect');
    input.classList.add('correct');
    indicator.textContent = 'Perfect!';
    indicator.classList.add('good');

    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('continueBtn').style.display = 'inline-block';
    document.getElementById('progressBtn').style.display = 'inline-block';

    // Update stats
    chrome.storage.sync.get(['timesCompleted'], (result) => {
      const newCount = (result.timesCompleted || 0) + 1;
      chrome.storage.sync.set({ timesCompleted: newCount });
      document.getElementById('timesCompleted').textContent = newCount;
    });

  } else if (fullTarget.startsWith(typed)) {
    // On track
    input.classList.remove('incorrect', 'correct');
    const pct = Math.round((typed.length / fullTarget.length) * 100);
    indicator.textContent = pct + '% matched';
    indicator.classList.remove('good');

  } else {
    // Wrong
    input.classList.add('incorrect');
    input.classList.remove('correct');
    indicator.textContent = 'Check your typing...';
    indicator.classList.remove('good');
  }
});

// Continue button
document.getElementById('continueBtn').addEventListener('click', () => {
  // Redirect to a search page or blank
  window.location.href = 'https://www.google.com';
});

// Progress button
document.getElementById('progressBtn').addEventListener('click', () => {
  window.location.href = chrome.runtime.getURL('detox-timeline.html');
});

// Allow Enter to submit when complete
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && completed) {
    window.location.href = 'https://www.google.com';
  }
});

// Focus input on load
input.focus();
