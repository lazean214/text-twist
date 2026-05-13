const fs = require("fs");
const path = require("path");
const dictionary = require("an-array-of-english-words");

const dictSet = new Set(dictionary.map(w => w.toLowerCase()));
const roundsPath = path.join(process.cwd(), "src", "data", "rounds.json");

if (!fs.existsSync(roundsPath)) {
    console.error("rounds.json not found");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(roundsPath, "utf8"));
let missingBefore = 0;
let filledNow = 0;
const filledBingos = [];

function getSubWords(bingo) {
    const letters = bingo.toLowerCase().split("");
    const results = new Set();

    function permute(current, remainingIndices) {
        if (current.length >= 3 && current.length <= 6 && current.length < bingo.length) {
            if (dictSet.has(current) && /^[a-z]+$/.test(current)) {
                results.add(current);
            }
        }
        if (current.length === 6) return;

        for (let i = 0; i < remainingIndices.length; i++) {
            const nextIdx = remainingIndices[i];
            permute(current + letters[nextIdx], remainingIndices.filter((_, idx) => idx !== i));
        }
    }

    permute("", letters.map((_, i) => i));
    return Array.from(results).sort((a, b) => a.length - b.length || a.localeCompare(b));
}

data.wordPool.forEach(entry => {
    const isMissing = !entry.subWords || entry.subWords.length === 0;
    if (isMissing) {
        missingBefore++;
        const generated = getSubWords(entry.bingo);
        entry.subWords = generated;
        entry.sub = generated.length;
        filledNow++;
        if (filledBingos.length < 10) {
            filledBingos.push(entry.bingo);
        }
    }
});

fs.writeFileSync(roundsPath, JSON.stringify(data, null, 2));

console.log(`Total wordPool entries: ${data.wordPool.length}`);
console.log(`Missing before: ${missingBefore}`);
console.log(`Filled now: ${filledNow}`);
console.log(`First 10 filled bingo words: ${filledBingos.join(", ")}`);
