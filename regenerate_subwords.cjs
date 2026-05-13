const fs = require("fs");
const path = require("path");

const ROUNDS_PATH = path.join("src", "data", "rounds.json");
const WORDLIST_PATH = "englishword300.md";

const allowedRaw = fs.readFileSync(WORDLIST_PATH, "utf8").split(/\r?\n/);
const allowedWords = new Set();
for (let line of allowedRaw) {
    const word = line.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (word.length >= 3 && word.length <= 5) {
        allowedWords.add(word);
    }
}
const allowedArray = Array.from(allowedWords);

const data = JSON.parse(fs.readFileSync(ROUNDS_PATH, "utf8"));

function getCounts(word) {
    const counts = {};
    for (const char of word) {
        counts[char] = (counts[char] || 0) + 1;
    }
    return counts;
}

function canForm(candidate, bingoCounts) {
    const candCounts = getCounts(candidate);
    for (const char in candCounts) {
        if (!bingoCounts[char] || candCounts[char] > bingoCounts[char]) {
            return false;
        }
    }
    return true;
}

const caps = {
    "simple": 15,
    "hard": 20,
    "hardest": 30
};

let totalEntries = 0;
let entriesWithSub = 0;
let entriesZeroSub = 0;
const zeroSubBingos = [];
const subWordFrequency = {};

const levels = data.levels || [];

levels.forEach(level => {
    // If difficulty is not on the level itself, we might need to find where it is.
    // Based on the 'rounds.json' output, I don't see difficulty here.
    // I will try to infer it or use a default.
    const difficulty = level.difficulty || "hardest"; 
    const cap = caps[difficulty] || 30;
    
    // Check if it's candidateWords or wordPool
    const pool = level.candidateWords || level.wordPool || [];

    // If candidateWords is just an array of strings, we need to handle that.
    // But then where are the subWords stored?
    // Wait, the tail showed: 
    //   "subWords": [...],
    //   "sub": 20
    // This suggests the objects are in the levels themselves? 
    // Let me re-read the json output.
    
    // Based on the tail, it seems each level object might be a 'round' object?
    // Let's check the middle of the file.
});
