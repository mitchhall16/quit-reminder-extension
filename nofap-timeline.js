const phases = [
  {
    time: "Days 1-3",
    title: "The Beginning",
    difficulty: "extreme",
    description: "Your brain is screaming for dopamine. Urges are intense and frequent. This is the hardest part - but also the shortest.",
    symptoms: ["Strong urges", "Irritability", "Restlessness", "Trouble sleeping", "Mood swings"],
    tips: ["Stay busy - idle hands are dangerous", "Take cold showers when urges hit", "Exercise to burn off energy", "Delete triggering apps/bookmarks", "Tell someone for accountability"]
  },
  {
    time: "Days 4-7",
    title: "First Week Warrior",
    difficulty: "hard",
    description: "Urges come in waves. You might feel flatline starting - low libido, low motivation. This is NORMAL. Your brain is recalibrating.",
    symptoms: ["Wave-like urges", "Possible flatline", "Fatigue", "Brain fog", "Anxiety"],
    tips: ["Recognize urges as your brain healing", "Don't test yourself with 'just a peek'", "Get outside - nature helps", "Journal your thoughts", "Remember: flatline is progress"]
  },
  {
    time: "Days 8-14",
    title: "The Flatline",
    difficulty: "medium",
    description: "Many experience 'flatline' - feeling numb, low energy, no libido. Don't panic. This is your brain resetting its dopamine system.",
    symptoms: ["Low energy", "No libido", "Feeling numb", "Depression-like symptoms", "Questioning if it's worth it"],
    goodSymptoms: ["Urges less frequent", "More free time", "Starting to feel proud"],
    tips: ["This is temporary - it WILL pass", "Stay the course", "Focus on building new habits", "Connect with others", "Exercise even when you don't feel like it"]
  },
  {
    time: "Days 15-30",
    title: "Emergence",
    difficulty: "medium",
    description: "Flatline starts lifting. Energy returns. You start noticing benefits - better focus, more confidence, people seem more attractive in real life.",
    symptoms: ["Occasional strong urges", "Mood fluctuations"],
    goodSymptoms: ["Increased energy", "Better focus", "More confidence", "Attraction to real people", "Improved sleep"],
    tips: ["Don't get cocky - stay vigilant", "Channel energy into goals", "Start new projects", "Socialize more", "The urges still come - be ready"]
  },
  {
    time: "Days 31-60",
    title: "Building Momentum",
    difficulty: "easy",
    description: "You're rewiring. Benefits compound. Confidence is real. Motivation is back. You start to see how much time and energy you wasted before.",
    symptoms: ["Rare urges (but can be intense)", "Occasional mood dips"],
    goodSymptoms: ["Stable mood", "High motivation", "Genuine confidence", "Better social skills", "Mental clarity", "Productivity boost"],
    tips: ["Use this energy productively", "Set bigger goals", "Help others on their journey", "Stay humble - addiction is patient", "Build the life you want"]
  },
  {
    time: "Days 61-90",
    title: "The Home Stretch",
    difficulty: "easy",
    description: "Almost there. Your brain has formed new pathways. The old triggers have less power. You're becoming a new person.",
    symptoms: ["Very rare urges"],
    goodSymptoms: ["Strong willpower", "Clear thinking", "Emotional stability", "Self-respect", "Healthy view of intimacy"],
    tips: ["Don't count days - make days count", "This is a lifestyle now", "Be wary of complacency", "Help newcomers", "Plan for life after 90"]
  },
  {
    time: "Day 90+",
    title: "Reboot Complete",
    difficulty: "free",
    description: "You did it. Your brain has significantly rewired. This isn't the end - it's the beginning of your new life. Stay vigilant, stay humble, stay free.",
    symptoms: [],
    goodSymptoms: ["Freedom from addiction", "Full emotional range", "Healthy sexuality", "Massive self-discipline", "Complete self-respect", "New perspective on life"],
    tips: ["Never forget where you came from", "One relapse doesn't erase progress", "Keep the habits that got you here", "Pay it forward", "You're proof it's possible"]
  }
];

let currentDay = 0;

// Load from storage
chrome.storage.sync.get(['nofapStartDate', 'nofapEnabled'], (result) => {
  if (result.nofapEnabled && result.nofapStartDate) {
    const start = new Date(result.nofapStartDate);
    const now = new Date();
    currentDay = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  document.getElementById('dayNumber').textContent = currentDay;
  updateStreakStatus(currentDay);
  renderTimeline(currentDay);
  updateProgress(currentDay);
});

function updateStreakStatus(day) {
  const statusEl = document.getElementById('streakStatus');
  if (day === 0) {
    statusEl.textContent = "Your journey begins now";
  } else if (day < 7) {
    statusEl.textContent = "Pushing through the hardest days";
  } else if (day < 14) {
    statusEl.textContent = "First week conquered!";
  } else if (day < 30) {
    statusEl.textContent = "Breaking free from the chains";
  } else if (day < 60) {
    statusEl.textContent = "Building a new you";
  } else if (day < 90) {
    statusEl.textContent = "Almost at full reboot!";
  } else {
    statusEl.textContent = "Reboot complete - stay vigilant";
  }
}

function getCurrentPhaseIndex(day) {
  if (day <= 3) return 0;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 30) return 3;
  if (day <= 60) return 4;
  if (day <= 90) return 5;
  return 6;
}

function renderTimeline(day) {
  const container = document.getElementById('timeline');
  const currentPhaseIndex = getCurrentPhaseIndex(day);

  container.innerHTML = phases.map((phase, index) => {
    let statusClass = '';
    if (index < currentPhaseIndex) {
      statusClass = 'completed';
    } else if (index === currentPhaseIndex) {
      statusClass = 'current';
    }

    const allSymptoms = [
      ...(phase.symptoms || []).map(s => `<span class="symptom">${s}</span>`),
      ...(phase.goodSymptoms || []).map(s => `<span class="symptom good">${s}</span>`)
    ].join('');

    return `
      <div class="phase ${statusClass}">
        <div class="phase-header">
          <div>
            <div class="phase-time">${phase.time}</div>
            <div class="phase-title">${phase.title}</div>
          </div>
          <span class="phase-difficulty difficulty-${phase.difficulty}">
            ${phase.difficulty === 'extreme' ? 'Very Hard' :
              phase.difficulty === 'hard' ? 'Hard' :
              phase.difficulty === 'medium' ? 'Moderate' :
              phase.difficulty === 'easy' ? 'Easier' : 'Freedom'}
          </span>
        </div>
        <div class="phase-body">
          ${phase.description}
          ${allSymptoms ? `<div class="symptoms">${allSymptoms}</div>` : ''}
          <div class="tips">
            <div class="tips-title">Survival Tips</div>
            <ul class="tips-list">
              ${phase.tips.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateProgress(day) {
  // Progress toward 90 day reboot
  const progress = Math.min(100, Math.round((day / 90) * 100));
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent =
    day >= 90 ? 'REBOOT COMPLETE!' : `${progress}% to 90-day reboot`;
}

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});
