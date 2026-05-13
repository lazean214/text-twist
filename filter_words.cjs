const fs = require("fs");
const path = require("path");

const roundsPath = path.join("src", "data", "rounds.json");
const googleWordsPath = "google-10000-english.txt";

if (!fs.existsSync(roundsPath)) {
  console.error("rounds.json not found");
  process.exit(1);
}
if (!fs.existsSync(googleWordsPath)) {
  console.error("google-10000-english.txt not found");
  process.exit(1);
}

const rounds = JSON.parse(fs.readFileSync(roundsPath, "utf8"));
const commonWords = new Set(
  fs.readFileSync(googleWordsPath, "utf8")
    .split("\n")
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)
);

const coreBingos = [
  "PLANET", "GARDEN", "FLOWER", "BRIGHT", "STREAK", "BASKET", "STRONG", "MANTEL", 
  "SQUARE", "DANGER", "TRAVEL", "ROCKET", "BRIDGE", "WINDOW", "SUMMER", "WINTER", 
  "ORANGE", "SILVER", "GUITAR", "SPRING", "ACTION", "DREAMS", "PHONES", "CLOUDS", 
  "QUARTZ", "WIZARD", "ZENITH", "NATURE"
];

const protectedWords = new Set();
rounds.forEach(round => {
  if (round.wordPool) {
    round.wordPool.forEach(poolItem => {
      if (coreBingos.includes(poolItem.bingo.toUpperCase())) {
        if (Array.isArray(poolItem.subWords)) {
          poolItem.subWords.forEach(sw => protectedWords.add(sw.toUpperCase()));
        }
      }
    });
  }
});

let entriesChanged = 0;
let totalRemovedCount = 0;
const removedWordsSample = [];

rounds.forEach(round => {
  if (round.wordPool) {
    round.wordPool.forEach(poolItem => {
      const bingo = poolItem.bingo.toUpperCase();
      const originalSubWords = poolItem.subWords || [];
      const filtered = originalSubWords.filter(sw => {
        const norm = sw.toUpperCase().replace(/[^A-Z]/g, "");
        if (norm.length < 3 || norm.length > 6) return false;
        if (norm === bingo) return false;
        if (commonWords.has(norm.toLowerCase())) return true;
        if (protectedWords.has(norm)) return true;
        return false;
      });

      let finalSubWords = Array.from(new Set(filtered))
        .sort((a, b) => a.length - b.length || a.localeCompare(b));

      if (finalSubWords.length < 5) {
        finalSubWords = Array.from(new Set(
          originalSubWords.filter(sw => {
            const norm = sw.toUpperCase().replace(/[^A-Z]/g, "");
            return norm.length >= 3 && norm.length <= 6 && norm !== bingo;
          })
        )).sort((a, b) => a.length - b.length || a.localeCompare(b));
      }

      const originalSet = new Set(originalSubWords);
      const finalSet = new Set(finalSubWords);
      
      let changed = false;
      originalSubWords.forEach(w => {
        if (!finalSet.has(w)) {
          totalRemovedCount++;
          if (removedWordsSample.length < 20) removedWordsSample.push(w);
          changed = true;
        }
      });
      if (finalSubWords.length !== originalSubWords.length) changed = true;

      if (changed) {
        entriesChanged++;
        poolItem.subWords = finalSubWords;
        if (typeof poolItem.sub === "number") {
          poolItem.sub = finalSubWords.length;
        }
      }
    });
  }
});

fs.writeFileSync(roundsPath, JSON.stringify(rounds, null, 2));

console.log(`Entries changed: ${entriesChanged}`);
console.log(`Total removed: ${totalRemovedCount}`);
console.log(`Sample removed words: ${removedWordsSample.join(", ")}`);
