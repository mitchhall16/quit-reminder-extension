const phases = [
  {
    time: "Day 1",
    dayStart: 0,
    dayEnd: 1,
    title: "The Beginning",
    difficulty: "medium",
    difficultyLabel: "Moderate",
    description: "Nicotine leaves your bloodstream. Cravings start but are manageable. Your body begins adjusting.",
    symptoms: ["Mild cravings", "Restlessness", "Anxiety starting", "Increased appetite"],
    tips: ["Drink lots of water", "Stay busy", "Deep breathing when cravings hit", "Remove all nicotine products"]
  },
  {
    time: "Day 2",
    dayStart: 1,
    dayEnd: 2,
    title: "Cravings Intensify",
    difficulty: "hard",
    difficultyLabel: "Hard",
    description: "Nicotine levels dropping fast. Your brain is demanding more. Irritability peaks. Stay strong.",
    symptoms: ["Strong cravings", "Irritability", "Headaches", "Trouble sleeping", "Sweating"],
    tips: ["Exercise helps release dopamine", "Eat small meals to keep blood sugar stable", "Tell someone you're quitting for accountability"]
  },
  {
    time: "Day 3",
    dayStart: 2,
    dayEnd: 3,
    title: "The Peak",
    difficulty: "extreme",
    difficultyLabel: "Hardest Day",
    description: "This is typically the worst day. Nicotine is almost completely gone. Your brain is screaming. If you survive today, you can quit.",
    symptoms: ["Intense cravings", "Anger/frustration", "Brain fog", "Fatigue", "Night sweats", "Anxiety"],
    tips: ["Just survive this day - that's the only goal", "Cravings last 3-5 minutes - ride them out", "Take a walk when it gets bad", "Remember: after today it gets easier"]
  },
  {
    time: "Days 4-7",
    dayStart: 3,
    dayEnd: 7,
    title: "Turning Point",
    difficulty: "hard",
    difficultyLabel: "Hard but Better",
    description: "Still tough, but noticeably easier than day 3. Cravings come in waves but are less intense. You're doing it.",
    symptoms: ["Decreasing cravings", "Mood swings", "Cough/clearing lungs", "Better sleep starting"],
    goodSymptoms: ["Taste improving", "Smell improving", "More energy starting"],
    tips: ["Notice the small improvements", "Reward yourself (not with nicotine)", "Physical symptoms fading"]
  },
  {
    time: "Week 2",
    dayStart: 7,
    dayEnd: 14,
    title: "Stabilizing",
    difficulty: "medium",
    difficultyLabel: "Moderate",
    description: "Physical withdrawal mostly done. Now it's mental. Habits and triggers are the challenge. Your brain is rewiring.",
    symptoms: ["Occasional cravings", "Emotional ups and downs", "Concentration improving"],
    goodSymptoms: ["Sleeping better", "More energy", "Food tastes amazing", "Breathing easier"],
    tips: ["Identify your triggers and avoid them", "Replace the habit with something healthy", "You're past the hardest part"]
  },
  {
    time: "Weeks 3-4",
    dayStart: 14,
    dayEnd: 30,
    title: "New Normal",
    difficulty: "easy",
    difficultyLabel: "Getting Easy",
    description: "Cravings are rare and weak. You might go hours without thinking about nicotine. Energy and mood stabilizing.",
    symptoms: ["Rare cravings", "Occasional triggers"],
    goodSymptoms: ["Stable mood", "Good energy", "Clear thinking", "Better skin", "Improved circulation"],
    tips: ["Don't get overconfident - stay vigilant", "One puff = back to day 1", "You're almost free"]
  },
  {
    time: "Month 2-3",
    dayStart: 30,
    dayEnd: 90,
    title: "Freedom",
    difficulty: "free",
    difficultyLabel: "You Made It",
    description: "You're essentially free. Cravings are rare and easy to dismiss. You feel like a non-user. Brain chemistry normalized.",
    symptoms: [],
    goodSymptoms: ["Feel normal without it", "No daily cravings", "Better health", "Money saved", "Control regained"],
    tips: ["Stay humble - addiction never fully goes away", "Help someone else quit", "Enjoy your freedom"]
  }
];

let currentDay = 1;

function updateTimeline() {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  phases.forEach(phase => {
    const isCompleted = currentDay > phase.dayEnd;
    const isCurrent = currentDay >= phase.dayStart && currentDay <= phase.dayEnd;

    const div = document.createElement('div');
    div.className = 'phase' + (isCompleted ? ' completed' : '') + (isCurrent ? ' current' : '');

    let symptomsHtml = '';
    if (phase.symptoms && phase.symptoms.length > 0) {
      symptomsHtml = phase.symptoms.map(s => '<span class="symptom">' + s + '</span>').join('');
    }
    if (phase.goodSymptoms && phase.goodSymptoms.length > 0) {
      symptomsHtml += phase.goodSymptoms.map(s => '<span class="symptom good">' + s + '</span>').join('');
    }

    let tipsHtml = '';
    if (phase.tips && phase.tips.length > 0) {
      tipsHtml = '<div class="tips">' +
        '<div class="tips-title">Tips for this phase</div>' +
        '<ul class="tips-list">' +
        phase.tips.map(t => '<li>' + t + '</li>').join('') +
        '</ul></div>';
    }

    div.innerHTML = '<div class="phase-header">' +
      '<div>' +
      '<div class="phase-time">' + phase.time + '</div>' +
      '<div class="phase-title">' + phase.title + '</div>' +
      '</div>' +
      '<span class="phase-difficulty difficulty-' + phase.difficulty + '">' + phase.difficultyLabel + '</span>' +
      '</div>' +
      '<div class="phase-body">' +
      '<p>' + phase.description + '</p>' +
      '<div class="symptoms">' + symptomsHtml + '</div>' +
      tipsHtml +
      '</div>';

    timeline.appendChild(div);
  });
}

function updateProgress() {
  const maxDays = 90;
  const pct = Math.min((currentDay / maxDays) * 100, 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = Math.round(pct) + '% to 90 days';
}

function updateMoney() {
  const nicotineCost = parseFloat(document.getElementById('nicotineCost').value) || 0;
  const alcoholCost = parseFloat(document.getElementById('alcoholCost').value) || 0;
  const daily = nicotineCost + alcoholCost;
  const saved = daily * currentDay;
  document.getElementById('moneySaved').textContent = '$' + saved.toFixed(0);
}

function setDay(day) {
  currentDay = Math.max(0, Math.min(365, day));
  document.getElementById('dayNumber').textContent = currentDay;
  document.getElementById('dayInput').value = currentDay;
  updateTimeline();
  updateProgress();
  updateMoney();

  localStorage.setItem('quitDay', currentDay);
}

// Event listeners
document.getElementById('dayInput').addEventListener('input', (e) => {
  setDay(parseInt(e.target.value) || 0);
});

document.getElementById('nicotineCost').addEventListener('input', updateMoney);
document.getElementById('alcoholCost').addEventListener('input', updateMoney);

// Load saved day
const savedDay = localStorage.getItem('quitDay');
if (savedDay) {
  setDay(parseInt(savedDay));
} else {
  setDay(1);
}
