# Quit Reminder

A Chrome extension that helps you stay accountable when quitting nicotine, alcohol, and other habits. Every new tab requires typing your personal affirmation before you can browse.

## Features

- **New Tab Affirmation Gate** — Every new tab shows your affirmation text that you must type before browsing
- **Timed Reminders** — Configurable reminders every 40 minutes (default) with mood check-ins
- **Progress Tracking** — Days clean, affirmations typed, and money saved
- **Editable Affirmation** — Customize your personal affirmation text
- **Bedtime Blocker** — Block browsing during set hours to improve sleep
- **Crisis Support** — AI-powered crisis chat using Claude API

## Built-in Tools

The extension includes 16 standalone tools accessible from the popup:

| Tool | Description |
|------|-------------|
| **Detox Timeline** | Nicotine withdrawal timeline and milestones |
| **Alcohol Timeline** | Alcohol recovery timeline and health improvements |
| **NoFap Timeline** | Recovery timeline and streak tracking |
| **Supplement Schedule** | Daily supplement planning and reminders |
| **Supplement Reminder** | Timed supplement notifications |
| **Crisis Chat** | AI-powered support chat (Claude API) |
| **Cooking Guide** | Healthy meal ideas and cooking guidance |
| **Recipe Chat** | AI-powered recipe suggestions |
| **Voice Message** | Record voice messages to your future self |
| **Trigger Log** | Track triggers and patterns |
| **Coping Tools** | Breathing exercises and coping strategies |
| **Alarm Clock** | Built-in alarm with customizable sounds |
| **Bedtime Block** | Screen time blocker for sleep hours |
| **Time Limit** | Browsing time limit enforcement |
| **Weekly Scheduler** | Plan your week to stay on track |
| **Daily Habits** | Daily habit tracking and streaks |
| **Phone Tracker** | Monitor phone/screen usage |

## Installation

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `quit-reminder-extension` folder
6. Click the extension icon in the toolbar to configure settings

## Configuration

Click the extension icon to access settings:

- **Affirmation text** — What you type on each new tab
- **Reminder interval** — How often reminders appear (default: 40 min)
- **Daily spending** — Your previous daily spend (for savings calculator)
- **Quit date** — When you started (for day counting)

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Storage API (sync + local)
- Chrome Alarms API
- Anthropic Claude API (crisis chat + recipe chat)
- Web Audio API (alarm sounds)
