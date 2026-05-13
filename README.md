# Text Twist

A React + TypeScript + Vite word puzzle game inspired by Text Twist.

## Highlights

- 100 level progression
- Difficulty bands: simple, hard, hardest
- Round timer and score system
- Keyboard controls and clickable letter rack
- PWA support with offline caching
- JSON-driven word content

## Tech Stack

- React 19
- TypeScript
- Vite
- vite-plugin-pwa

## Getting Started

Requirements:

- Node.js 20+ recommended

Install dependencies:

npm install

Start development server:

npm run dev

Build production bundle:

npm run build

Preview production build:

npm run preview

## Gameplay Rules

- You get 2 minutes per round.
- Submit words of length 3 and above.
- Find the full bingo word to clear the level.
- If time runs out without the bingo word, retry the level.

Scoring:

- Base: word length x 100
- Bingo bonus: +1000 for the full bingo word

## Controls

- Type letters A-Z to add from the rack
- Enter to submit
- Backspace or Delete to remove last letter
- Space to twist letters

## Word Data Format

Game data is sourced from [src/data/rounds.json](src/data/rounds.json).

Current structure supports:

- top-level metadata, such as totalWords and difficultyGroups
- levels array for level-to-candidate mapping
- wordPool array for playable words and sub-words

Each wordPool item uses:

- bingo: main target word
- difficulty: simple, hard, or hardest
- sub or subWords: accepted smaller words

The app normalizes both sub and subWords for compatibility.

## Level Selection Behavior

- App level cap is 100.
- The round is selected from a difficulty pool based on level range:
  - 1 to 30: simple
  - 31 to 70: hard
  - 71 to 100: hardest
- It avoids repeating already used bingo words until the pool is exhausted.

## PWA and Offline

The app is configured as a Progressive Web App in [vite.config.ts](vite.config.ts).

Features:

- Auto service worker registration and updates
- App manifest with install metadata
- Workbox precache for app assets
- Offline navigation fallback to index.html

After the first successful load, the app should work offline for core gameplay.

## Project Files

- Main game logic: [src/App.tsx](src/App.tsx)
- Game styles: [src/App.css](src/App.css)
- Word data: [src/data/rounds.json](src/data/rounds.json)
- PWA config: [vite.config.ts](vite.config.ts)

## Notes

- If a wordPool entry has no sub/subWords, that round may feel incomplete.
- Keep bingo words and sub-words uppercase-safe alphabetic strings for best compatibility.
