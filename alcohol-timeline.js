const phases = [
  {
    time: "Hours 1-12",
    title: "Early Withdrawal",
    difficulty: "hard",
    description: "As alcohol leaves your system, your body starts to react. Anxiety, shakiness, and cravings begin. Stay strong - this is temporary.",
    symptoms: ["Anxiety", "Shakiness", "Sweating", "Nausea", "Headache", "Cravings"],
    tips: ["Stay hydrated - drink lots of water", "Eat something even if not hungry", "Have someone check on you", "Keep busy with distractions", "Remember why you're doing this"]
  },
  {
    time: "Hours 12-48",
    title: "Peak Withdrawal",
    difficulty: "extreme",
    description: "This is often the hardest part. Symptoms intensify. Your brain is recalibrating its chemistry. Every hour you get through is a victory.",
    symptoms: ["Intense cravings", "Insomnia", "Increased heart rate", "High blood pressure", "Irritability", "Confusion"],
    tips: ["Seek medical help if symptoms are severe", "Don't be alone - reach out", "Take it hour by hour", "Cold showers can help", "This is the worst it gets - it only improves from here"]
  },
  {
    time: "Days 3-5",
    title: "Turning the Corner",
    difficulty: "hard",
    description: "Physical symptoms start to ease. Sleep is still rough. Cravings come and go. Your body is healing faster than you think.",
    symptoms: ["Lingering anxiety", "Sleep issues", "Mood swings", "Low energy", "Occasional cravings"],
    goodSymptoms: ["Physical symptoms fading", "Appetite returning", "Clearer thinking"],
    tips: ["Get light exercise", "Establish a sleep routine", "Avoid triggers and triggering people", "Eat nutritious food", "Celebrate small wins"]
  },
  {
    time: "Days 6-14",
    title: "Physical Freedom",
    difficulty: "medium",
    description: "Most physical withdrawal is over. Sleep starts improving. Your liver is already healing. The mental game becomes the focus now.",
    symptoms: ["Psychological cravings", "Some anxiety", "PAWS (post-acute withdrawal)"],
    goodSymptoms: ["Better sleep", "More energy", "Clearer skin", "Weight stabilizing", "Improved digestion"],
    tips: ["Build new routines", "Find sober activities", "Address underlying issues", "Connect with support groups", "Journal your progress"]
  },
  {
    time: "Weeks 2-4",
    title: "Building New Normal",
    difficulty: "medium",
    description: "Life without alcohol becomes more natural. Benefits are visible - clearer skin, better sleep, money saved. But stay vigilant for triggers.",
    symptoms: ["Occasional strong cravings", "Social pressure", "FOMO at social events"],
    goodSymptoms: ["Stable mood", "Genuine energy", "Better relationships", "Saving money", "No hangovers", "Pride in yourself"],
    tips: ["Find sober friends or groups", "Plan for triggering situations", "Reward yourself with saved money", "Keep remembering the bad times", "Don't get overconfident"]
  },
  {
    time: "Month 1-3",
    title: "Deep Healing",
    difficulty: "easy",
    description: "Your liver is regenerating. Brain chemistry is normalizing. You're becoming who you were meant to be without alcohol holding you back.",
    symptoms: ["Rare cravings", "Social challenges"],
    goodSymptoms: ["Liver healing", "Mental clarity", "Emotional stability", "Physical fitness improving", "Better decision making", "Authentic happiness"],
    tips: ["Address root causes of drinking", "Build a life you don't need to escape from", "Help others who are struggling", "Never forget how bad it was", "This is your new normal"]
  },
  {
    time: "3+ Months",
    title: "The New You",
    difficulty: "free",
    description: "You've proven you can do this. Your body has healed significantly. The neural pathways for drinking are weakening. This is freedom.",
    symptoms: [],
    goodSymptoms: ["Complete physical recovery", "Emotional maturity", "True self-confidence", "Better relationships", "Financial improvement", "No more shame", "Control of your life"],
    tips: ["Stay humble - addiction is patient", "Keep your tools ready", "Help newcomers", "Continue building the life you want", "You're proof that change is possible"]
  }
];

let currentDay = 0;

// Load from storage (use main startDate since we track them together)
chrome.storage.sync.get(['startDate', 'dailyCost'], (result) => {
  if (result.startDate) {
    const start = new Date(result.startDate);
    const now = new Date();
    currentDay = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  document.getElementById('dayNumber').textContent = currentDay;
  updateStreakStatus(currentDay);
  renderTimeline(currentDay);
  updateProgress(currentDay);
  updateMoneySaved(currentDay, result.dailyCost || 10);
});

function updateStreakStatus(day) {
  const statusEl = document.getElementById('streakStatus');
  if (day === 0) {
    statusEl.textContent = "Day one - the most important day";
  } else if (day < 3) {
    statusEl.textContent = "Pushing through the hardest part";
  } else if (day < 7) {
    statusEl.textContent = "Physical freedom approaching";
  } else if (day < 14) {
    statusEl.textContent = "Your body is thanking you";
  } else if (day < 30) {
    statusEl.textContent = "Building your new life";
  } else if (day < 90) {
    statusEl.textContent = "Deep healing in progress";
  } else {
    statusEl.textContent = "Living proof that change is possible";
  }
}

function getCurrentPhaseIndex(day) {
  if (day < 1) return 0;
  if (day < 2) return 1;
  if (day < 5) return 2;
  if (day < 14) return 3;
  if (day < 30) return 4;
  if (day < 90) return 5;
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
  // Progress toward 30 days (first major milestone)
  const progress = Math.min(100, Math.round((day / 30) * 100));
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent =
    day >= 30 ? '30 DAYS ACHIEVED!' : `${progress}% to 30 days`;
}

function updateMoneySaved(day, dailyCost) {
  // Assume half of dailyCost is alcohol-related
  const alcoholPortion = Math.round(dailyCost * 0.5);
  const saved = day * alcoholPortion;
  document.getElementById('moneySaved').textContent = '$' + saved;
}

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});
