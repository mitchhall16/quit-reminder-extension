// Tool selection
document.querySelectorAll('.tool-card').forEach(card => {
  card.addEventListener('click', () => {
    const tool = card.dataset.tool;

    // Toggle active state
    document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tool-content').forEach(c => c.classList.remove('active'));

    card.classList.add('active');
    document.getElementById(tool + '-content').classList.add('active');

    // Initialize specific tools
    if (tool === 'activity') {
      showRandomActivity();
    } else if (tool === 'tape') {
      showTapeForward();
    }
  });
});

// ===== BREATHING EXERCISE =====
let breathingInterval = null;
let isBreathing = false;

document.getElementById('breathingBtn').addEventListener('click', () => {
  if (isBreathing) {
    stopBreathing();
  } else {
    startBreathing();
  }
});

function startBreathing() {
  isBreathing = true;
  document.getElementById('breathingBtn').textContent = 'Stop';

  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  const instruction = document.getElementById('breathingInstruction');

  let phase = 0; // 0: inhale, 1: hold, 2: exhale
  const phases = [
    { name: 'Breathe In', duration: 4000, scale: 'inhale' },
    { name: 'Hold', duration: 7000, scale: 'inhale' },
    { name: 'Breathe Out', duration: 8000, scale: 'exhale' }
  ];

  function nextPhase() {
    const current = phases[phase];
    text.textContent = current.name;
    circle.className = 'breathing-circle ' + current.scale;

    phase = (phase + 1) % 3;
  }

  nextPhase();
  breathingInterval = setInterval(() => {
    nextPhase();
  }, phases[phase === 0 ? 2 : phase - 1].duration);
}

function stopBreathing() {
  isBreathing = false;
  clearInterval(breathingInterval);
  document.getElementById('breathingBtn').textContent = 'Start Breathing Exercise';
  document.getElementById('breathingCircle').className = 'breathing-circle';
  document.getElementById('breathingText').textContent = 'Ready';
}

// ===== CRAVING TIMER =====
let timerInterval = null;
let timerSeconds = 20 * 60; // 20 minutes
let timerRunning = false;

document.getElementById('timerBtn').addEventListener('click', () => {
  if (timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
});

function startTimer() {
  timerRunning = true;
  timerSeconds = 20 * 60;
  document.getElementById('timerBtn').textContent = 'Reset Timer';

  timerInterval = setInterval(() => {
    timerSeconds--;

    if (timerSeconds <= 0) {
      stopTimer();
      document.getElementById('timerMessage').innerHTML =
        '<strong style="color: #4ade80;">You made it!</strong><br>The craving has passed. You are stronger than your urges.';
      document.getElementById('timerNumber').textContent = 'DONE!';
      return;
    }

    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timerNumber').textContent =
      `${mins}:${secs.toString().padStart(2, '0')}`;

    // Progress bar
    const progress = (timerSeconds / (20 * 60)) * 100;
    document.getElementById('timerProgress').style.width = progress + '%';

    // Update message at milestones
    if (timerSeconds === 15 * 60) {
      document.getElementById('timerMessage').innerHTML =
        '15 minutes left. The hardest part might be right now.<br>Keep going.';
    } else if (timerSeconds === 10 * 60) {
      document.getElementById('timerMessage').innerHTML =
        '10 minutes left. You\'re halfway there.<br>The craving is starting to fade.';
    } else if (timerSeconds === 5 * 60) {
      document.getElementById('timerMessage').innerHTML =
        '5 minutes left. Almost there.<br>You\'re proving to yourself that you can do this.';
    } else if (timerSeconds === 2 * 60) {
      document.getElementById('timerMessage').innerHTML =
        '2 minutes left!<br>You\'re about to beat this craving.';
    }
  }, 1000);
}

function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerSeconds = 20 * 60;
  document.getElementById('timerBtn').textContent = 'Start Timer';
  document.getElementById('timerNumber').textContent = '20:00';
  document.getElementById('timerProgress').style.width = '100%';
  document.getElementById('timerMessage').innerHTML =
    'Cravings peak around 3-5 minutes, then fade.<br>You just have to survive 20 minutes. You\'ve survived worse.';
}

// ===== GROUNDING =====
document.querySelectorAll('.grounding-input').forEach(input => {
  input.addEventListener('input', () => {
    const step = input.closest('.grounding-step');
    if (input.value.trim()) {
      step.classList.add('done');
    } else {
      step.classList.remove('done');
    }
  });
});

// ===== PLAY TAPE FORWARD =====
function showTapeForward() {
  const timeline = document.getElementById('tapeTimeline');

  // Could customize based on what they're craving, but general for now
  const moments = [
    { time: 'Right now', feeling: 'You give in. Brief moment of relief. The craving stops.' },
    { time: '5 minutes later', feeling: 'The high is already fading. Was it even worth it?' },
    { time: '30 minutes later', feeling: 'Guilt sets in. You think about your streak. Reset to day 0.' },
    { time: '1 hour later', feeling: 'Shame. "Why did I do that?" You know you\'re stronger than this.' },
    { time: 'Tomorrow morning', feeling: 'You have to start over. All that progress, gone for 5 minutes of relief.' },
    { time: 'Next craving', feeling: 'It\'s even harder now. You\'ve proven to yourself that you can\'t resist.' }
  ];

  timeline.innerHTML = moments.map(m => `
    <div class="tape-moment bad">
      <div class="tape-time">${m.time}</div>
      <div class="tape-feeling">${m.feeling}</div>
    </div>
  `).join('');
}

document.getElementById('tapeBtn').addEventListener('click', () => {
  document.getElementById('tapeBtn').textContent = 'Good choice. You got this.';
  document.getElementById('tapeBtn').style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';

  setTimeout(() => {
    document.getElementById('tapeBtn').textContent = 'I Won\'t Give In';
    document.getElementById('tapeBtn').style.background = '';
  }, 3000);
});

// ===== REPLACEMENT ACTIVITY =====
const activities = [
  { icon: '🏃', name: 'Go for a walk', why: 'Physical movement releases the same chemicals you\'re craving.' },
  { icon: '💪', name: 'Do 20 pushups', why: 'Intense physical exertion kills cravings fast.' },
  { icon: '🚿', name: 'Take a cold shower', why: 'Cold water shocks your system and resets your brain.' },
  { icon: '🎮', name: 'Play a video game', why: 'Occupy your hands and mind with something engaging.' },
  { icon: '📞', name: 'Call or text someone', why: 'Connection with others reduces the isolation that feeds addiction.' },
  { icon: '🧹', name: 'Clean something', why: 'Productive distraction. You\'ll feel good after.' },
  { icon: '📺', name: 'Watch something funny', why: 'Laughter releases dopamine naturally.' },
  { icon: '🎵', name: 'Put on loud music', why: 'Music can shift your emotional state instantly.' },
  { icon: '✍️', name: 'Write down how you feel', why: 'Getting thoughts out of your head reduces their power.' },
  { icon: '🧘', name: 'Stretch for 5 minutes', why: 'Releases tension stored in your body.' },
  { icon: '🥤', name: 'Drink a big glass of water', why: 'Hydration helps. Sometimes cravings are just thirst.' },
  { icon: '🍎', name: 'Eat something healthy', why: 'Low blood sugar can trigger cravings. Fuel up.' },
  { icon: '🌳', name: 'Step outside for 2 minutes', why: 'Fresh air and change of environment helps.' },
  { icon: '📖', name: 'Read something', why: 'Engage your mind with something other than the craving.' },
  { icon: '🎨', name: 'Draw or doodle', why: 'Creative expression is therapeutic.' }
];

function showRandomActivity() {
  const activity = activities[Math.floor(Math.random() * activities.length)];
  document.getElementById('activityIcon').textContent = activity.icon;
  document.getElementById('activityName').textContent = activity.name;
  document.getElementById('activityWhy').textContent = activity.why;
}

document.getElementById('activityBtn').addEventListener('click', showRandomActivity);

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});
