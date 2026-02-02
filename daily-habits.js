// Daily Habits with Honest Confirmation

let habits = [];
let streakData = {
  currentStreak: 0,
  lastCompletedDate: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
});

function loadData() {
  chrome.storage.local.get(['dailyHabits', 'habitStreakData'], (result) => {
    habits = result.dailyHabits || [];
    streakData = result.habitStreakData || { currentStreak: 0, lastCompletedDate: null };

    // Check if we need to reset for a new day
    checkDayReset();

    renderHabits();
    updateStreakDisplay();
  });
}

function saveData() {
  chrome.storage.local.set({
    dailyHabits: habits,
    habitStreakData: streakData
  });
}

function checkDayReset() {
  const today = new Date().toDateString();
  const lastCompleted = streakData.lastCompletedDate;

  if (lastCompleted && lastCompleted !== today) {
    // Check if yesterday all habits were completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastCompleted === yesterdayStr) {
      // Streak continues, just reset completions for today
    } else {
      // Streak broken - missed a day
      streakData.currentStreak = 0;
    }

    // Reset all habit completions for the new day
    habits.forEach(habit => {
      habit.completedToday = false;
      habit.completedAt = null;
    });

    saveData();
  }
}

function setupEventListeners() {
  // Add habit button
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);

  // Enter key on inputs
  document.getElementById('habitName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('habitConfirmation').focus();
    }
  });

  document.getElementById('habitConfirmation').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addHabit();
    }
  });

  // Back link
  document.getElementById('backLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });
}

function addHabit() {
  const nameInput = document.getElementById('habitName');
  const confirmInput = document.getElementById('habitConfirmation');

  const name = nameInput.value.trim();
  const confirmation = confirmInput.value.trim();

  if (!name || !confirmation) {
    alert('Please enter both a habit name and confirmation phrase.');
    return;
  }

  const habit = {
    id: Date.now().toString(),
    name: name,
    confirmationPhrase: confirmation,
    completedToday: false,
    completedAt: null,
    streak: 0,
    createdAt: new Date().toISOString()
  };

  habits.push(habit);
  saveData();

  nameInput.value = '';
  confirmInput.value = '';
  nameInput.focus();

  renderHabits();
  updateStreakDisplay();
}

function deleteHabit(habitId) {
  if (confirm('Delete this habit? This cannot be undone.')) {
    habits = habits.filter(h => h.id !== habitId);
    saveData();
    renderHabits();
    updateStreakDisplay();
  }
}

function renderHabits() {
  const container = document.getElementById('habitsList');

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No habits yet. Add your first daily habit above!</p>
        <p style="font-size: 0.8rem; margin-top: 10px;">
          Examples: Clean apartment, Exercise, Read 30 mins, Meditate
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = habits.map(habit => `
    <div class="habit-item ${habit.completedToday ? 'completed' : ''}" data-id="${habit.id}">
      <div class="habit-header">
        <span class="habit-name">${escapeHtml(habit.name)}</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${habit.streak > 0 ? `<span class="habit-streak">🔥 ${habit.streak} day${habit.streak > 1 ? 's' : ''}</span>` : ''}
          <button class="delete-habit-btn" onclick="deleteHabit('${habit.id}')" title="Delete habit">×</button>
        </div>
      </div>

      <div class="completed-check">
        <span>✓</span>
        <span>Completed</span>
        <span class="completed-time">${habit.completedAt ? formatTime(habit.completedAt) : ''}</span>
      </div>

      <div class="habit-confirmation">
        <div class="confirmation-prompt">Type the confirmation to mark complete:</div>
        <div class="confirmation-text">"${escapeHtml(habit.confirmationPhrase)}"</div>
        <input
          type="text"
          class="confirmation-input"
          placeholder="Type the phrase above exactly..."
          oninput="checkConfirmation('${habit.id}', this)"
        >
        <button class="confirm-btn" id="confirm-${habit.id}" onclick="completeHabit('${habit.id}')" disabled>
          Type confirmation to unlock
        </button>
      </div>
    </div>
  `).join('');
}

function checkConfirmation(habitId, input) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  const typed = input.value.trim().toLowerCase();
  const target = habit.confirmationPhrase.toLowerCase();

  const btn = document.getElementById(`confirm-${habitId}`);

  if (typed === target) {
    input.classList.add('match');
    btn.classList.add('ready');
    btn.disabled = false;
    btn.textContent = 'Mark Complete ✓';
  } else {
    input.classList.remove('match');
    btn.classList.remove('ready');
    btn.disabled = true;
    btn.textContent = 'Type confirmation to unlock';
  }
}

function completeHabit(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit || habit.completedToday) return;

  habit.completedToday = true;
  habit.completedAt = new Date().toISOString();
  habit.streak = (habit.streak || 0) + 1;

  saveData();
  renderHabits();
  checkAllCompleted();
  updateStreakDisplay();

  // Show celebration
  showCelebration(habit.name);
}

function checkAllCompleted() {
  if (habits.length === 0) return;

  const allDone = habits.every(h => h.completedToday);

  if (allDone) {
    const today = new Date().toDateString();

    if (streakData.lastCompletedDate !== today) {
      streakData.currentStreak += 1;
      streakData.lastCompletedDate = today;
      saveData();
      updateStreakDisplay();

      // Big celebration for completing all habits
      showBigCelebration();
    }
  }
}

function updateStreakDisplay() {
  document.getElementById('totalStreak').textContent = streakData.currentStreak;

  // Update progress dots
  const progressContainer = document.getElementById('todayProgress');
  if (habits.length === 0) {
    progressContainer.innerHTML = '';
    return;
  }

  progressContainer.innerHTML = habits.map(h =>
    `<div class="progress-dot ${h.completedToday ? 'done' : ''}" title="${escapeHtml(h.name)}"></div>`
  ).join('');
}

function showCelebration(habitName) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #000;
    padding: 20px 40px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1.1rem;
    z-index: 1000;
    box-shadow: 0 10px 40px rgba(74, 222, 128, 0.4);
    animation: pop 0.3s ease-out;
  `;
  toast.innerHTML = `✓ ${escapeHtml(habitName)} complete!`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pop {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function showBigCelebration() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div style="text-align: center; animation: pop 0.5s ease-out;">
      <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
      <div style="font-size: 1.5rem; font-weight: 700; color: #4ade80; margin-bottom: 10px;">
        All Habits Complete!
      </div>
      <div style="font-size: 1.1rem; color: #94a3b8;">
        ${streakData.currentStreak} day streak! Keep it up!
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 2500);
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
