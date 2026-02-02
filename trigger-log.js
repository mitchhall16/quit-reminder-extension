let selectedType = null;
let selectedTriggers = [];
let selectedOutcome = null;

// Mode switching
document.getElementById('logModeBtn').addEventListener('click', () => {
  setActiveMode('log');
});
document.getElementById('historyModeBtn').addEventListener('click', () => {
  setActiveMode('history');
  loadHistory();
});
document.getElementById('patternsModeBtn').addEventListener('click', () => {
  setActiveMode('patterns');
  loadPatterns();
});

function setActiveMode(mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.log-section').forEach(s => s.classList.remove('active'));

  if (mode === 'log') {
    document.getElementById('logModeBtn').classList.add('active');
    document.getElementById('logSection').classList.add('active');
  } else if (mode === 'history') {
    document.getElementById('historyModeBtn').classList.add('active');
    document.getElementById('historySection').classList.add('active');
  } else {
    document.getElementById('patternsModeBtn').classList.add('active');
    document.getElementById('patternsSection').classList.add('active');
  }
}

// Type buttons
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
    checkSubmitEnabled();
  });
});

// Intensity slider
const intensitySlider = document.getElementById('intensitySlider');
const intensityValue = document.getElementById('intensityValue');

intensitySlider.addEventListener('input', () => {
  const val = intensitySlider.value;
  intensityValue.textContent = val;
  intensityValue.className = 'intensity-value intensity-' + val;
});

// Trigger buttons
document.querySelectorAll('.trigger-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const trigger = btn.dataset.trigger;
    if (selectedTriggers.includes(trigger)) {
      selectedTriggers = selectedTriggers.filter(t => t !== trigger);
    } else {
      selectedTriggers.push(trigger);
    }
  });
});

// Outcome buttons
document.querySelectorAll('.outcome-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedOutcome = btn.dataset.outcome;
    checkSubmitEnabled();
  });
});

function checkSubmitEnabled() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = !(selectedType && selectedOutcome);
}

// Submit
document.getElementById('submitBtn').addEventListener('click', () => {
  const entry = {
    id: Date.now().toString(),
    type: selectedType,
    intensity: parseInt(intensitySlider.value),
    triggers: selectedTriggers,
    notes: document.getElementById('notesInput').value.trim(),
    outcome: selectedOutcome,
    timestamp: new Date().toISOString(),
    hour: new Date().getHours()
  };

  chrome.storage.local.get(['triggerLog'], (result) => {
    const log = result.triggerLog || [];
    log.unshift(entry);
    // Keep last 100 entries
    if (log.length > 100) log.pop();

    chrome.storage.local.set({ triggerLog: log }, () => {
      // Reset form
      selectedType = null;
      selectedTriggers = [];
      selectedOutcome = null;
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('notesInput').value = '';
      intensitySlider.value = 5;
      intensityValue.textContent = '5';
      intensityValue.className = 'intensity-value intensity-5';
      document.getElementById('submitBtn').disabled = true;

      alert('Logged! ' + (entry.outcome === 'resisted' ? 'Great job resisting!' : 'Logged. Tomorrow is a new day.'));
    });
  });
});

// Load history
function loadHistory() {
  chrome.storage.local.get(['triggerLog'], (result) => {
    const log = result.triggerLog || [];
    const container = document.getElementById('historyList');

    if (log.length === 0) {
      container.innerHTML = '<div class="no-data">No cravings logged yet.</div>';
      return;
    }

    const typeLabels = { nicotine: 'Nicotine', alcohol: 'Alcohol', porn: 'Porn' };
    const triggerLabels = {
      stress: 'Stress', boredom: 'Boredom', social: 'Social', tired: 'Tired',
      hungry: 'Hungry', lonely: 'Lonely', celebration: 'Celebrating', habit: 'Habit',
      'saw-it': 'Saw someone', anger: 'Anger', anxiety: 'Anxiety', unknown: 'Unknown'
    };

    container.innerHTML = log.slice(0, 20).map(entry => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleString();
      const triggers = entry.triggers.map(t => `<span class="history-trigger">${triggerLabels[t] || t}</span>`).join('');

      return `
        <div class="history-item ${entry.outcome}">
          <div class="history-header">
            <span class="history-type">${typeLabels[entry.type] || entry.type}</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <div class="history-intensity">Intensity: ${entry.intensity}/10 • ${entry.outcome === 'resisted' ? 'Resisted' : 'Gave in'}</div>
          ${triggers ? `<div class="history-triggers">${triggers}</div>` : ''}
          ${entry.notes ? `<div class="history-notes">"${entry.notes}"</div>` : ''}
        </div>
      `;
    }).join('');
  });
}

// Load patterns
function loadPatterns() {
  chrome.storage.local.get(['triggerLog'], (result) => {
    const log = result.triggerLog || [];

    if (log.length === 0) {
      document.getElementById('totalCravings').textContent = '0';
      document.getElementById('timesResisted').textContent = '0';
      document.getElementById('resistanceRate').textContent = '0%';
      document.getElementById('avgIntensity').textContent = '0';
      return;
    }

    // Basic stats
    const total = log.length;
    const resisted = log.filter(e => e.outcome === 'resisted').length;
    const rate = Math.round((resisted / total) * 100);
    const avgIntensity = (log.reduce((sum, e) => sum + e.intensity, 0) / total).toFixed(1);

    document.getElementById('totalCravings').textContent = total;
    document.getElementById('timesResisted').textContent = resisted;
    document.getElementById('resistanceRate').textContent = rate + '%';
    document.getElementById('avgIntensity').textContent = avgIntensity;

    // Top triggers
    const triggerCounts = {};
    log.forEach(entry => {
      entry.triggers.forEach(t => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      });
    });

    const sortedTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const triggerLabels = {
      stress: 'Stress', boredom: 'Boredom', social: 'Social situation', tired: 'Tired',
      hungry: 'Hungry', lonely: 'Lonely', celebration: 'Celebrating', habit: 'Habit/routine',
      'saw-it': 'Saw someone else', anger: 'Anger/frustration', anxiety: 'Anxiety', unknown: 'Unknown'
    };

    const topTriggersEl = document.getElementById('topTriggers');
    if (sortedTriggers.length > 0) {
      topTriggersEl.innerHTML = sortedTriggers.map(([trigger, count]) => `
        <div class="pattern-stat">
          <span class="pattern-label">${triggerLabels[trigger] || trigger}</span>
          <span class="pattern-value">${count} times</span>
        </div>
      `).join('');
    }

    // Danger times
    const hourCounts = {};
    log.forEach(entry => {
      const hour = entry.hour;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const dangerTimesEl = document.getElementById('dangerTimes');

    if (sortedHours.length > 0) {
      dangerTimesEl.innerHTML = sortedHours.map(([hour, count]) => {
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum === 0 ? 12 : (hourNum > 12 ? hourNum - 12 : hourNum);
        return `
          <div class="pattern-stat">
            <span class="pattern-label">${displayHour}:00 ${ampm}</span>
            <span class="pattern-value">${count} cravings</span>
          </div>
        `;
      }).join('');
    }
  });
}

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});
