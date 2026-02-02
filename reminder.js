let affirmation = "I don't need to drink. I don't need nicotine. I am stronger than my cravings.";
let nofapAffirmation = "";
let nofapEnabled = false;
let completed = false;

// Play alarm sound when page opens
function playAlarm() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function beep(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  const now = audioCtx.currentTime;
  // Attention-grabbing pattern: 3 ascending beeps, pause, repeat
  beep(600, now, 0.15);
  beep(800, now + 0.2, 0.15);
  beep(1000, now + 0.4, 0.2);

  beep(600, now + 0.8, 0.15);
  beep(800, now + 1.0, 0.15);
  beep(1000, now + 1.2, 0.2);
}

// Play alarm on load
playAlarm();

// Load affirmation
chrome.storage.sync.get(['affirmation', 'nofapEnabled', 'nofapAffirmation'], (result) => {
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
});

// Clear reminder due flag
chrome.storage.sync.set({ reminderDue: false });

const input = document.getElementById('affirmationInput');
const indicator = document.getElementById('matchIndicator');

input.addEventListener('input', () => {
  const typed = input.value.trim().toLowerCase();

  // Build full target
  let fullTarget = affirmation.trim().toLowerCase();
  if (nofapEnabled && nofapAffirmation) {
    fullTarget += " " + nofapAffirmation.trim().toLowerCase();
  }

  if (typed === fullTarget) {
    completed = true;
    input.classList.add('correct');
    indicator.textContent = 'Perfect!';
    indicator.classList.add('good');

    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('skipLink').style.display = 'none';

    // Update stats
    chrome.storage.sync.get(['timesCompleted'], (result) => {
      const newCount = (result.timesCompleted || 0) + 1;
      chrome.storage.sync.set({ timesCompleted: newCount });
    });

  } else if (fullTarget.startsWith(typed)) {
    input.classList.remove('correct');
    const pct = Math.round((typed.length / fullTarget.length) * 100);
    indicator.textContent = pct + '% matched';
    indicator.classList.remove('good');

  } else {
    input.classList.remove('correct');
    indicator.textContent = 'Check your typing...';
    indicator.classList.remove('good');
  }
});

// Feeling buttons
document.querySelectorAll('.feeling-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.feeling-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('closeBtn').style.display = 'inline-block';

    // Log the feeling
    const feeling = btn.dataset.feeling;
    chrome.storage.sync.get(['feelingLog'], (result) => {
      const log = result.feelingLog || [];
      log.push({ time: Date.now(), feeling: feeling });
      // Keep last 100 entries
      if (log.length > 100) log.shift();
      chrome.storage.sync.set({ feelingLog: log });
    });
  });
});

// Close button
document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
});

// Skip link
document.getElementById('skipLink').addEventListener('click', () => {
  window.close();
});

// Focus input
input.focus();
