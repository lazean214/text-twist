const fs = require('fs');
const dictionary = require('an-array-of-english-words');

const roundsPath = 'src/data/rounds.json';
const roundsData = JSON.parse(fs.readFileSync(roundsPath, 'utf8'));

const getLetterCounts = (word) => {
    const counts = {};
    for (const char of word.toUpperCase()) {
        if (/[A-Z]/.test(char)) {
            counts[char] = (counts[char] || 0) + 1;
        }
    }
    return counts;
};

const canForm = (word, availableCounts) => {
    const wordCounts = getLetterCounts(word);
    for (const char in wordCounts) {
        if (!availableCounts[char] || wordCounts[char] > availableCounts[char]) {
            return false;
        }
    }
    return true;
};

let modifiedCount = 0;
const missingLengthsEntries = [];

roundsData.wordPool.forEach((entry) => {
    const bingo = entry.bingo.toUpperCase();
    const bingoCounts = getLetterCounts(bingo);
    const difficultyCaps = { simple: 15, hard: 20, hardest: 30 };
    const cap = difficultyCaps[entry.level] || 20;

    let candidates = [];
    const source = Array.isArray(entry.subWords) ? entry.subWords : (Array.isArray(entry.sub) ? entry.sub : []);
    
    candidates = source
        .map(w => w.toString().toUpperCase().replace(/[^A-Z]/g, ''))
        .filter(w => w.length >= 3 && w.length <= 5 && w !== bingo);

    const hasLen = (len) => candidates.some(w => w.length === len);
    const needsGen = !hasLen(3) || !hasLen(4) || !hasLen(5);

    if (needsGen) {
        const extraWords = dictionary.filter(w => {
            const up = w.toUpperCase();
            return up.length >= 3 && up.length <= 5 && up !== bingo && canForm(up, bingoCounts);
        }).map(w => w.toUpperCase());
        
        candidates = Array.from(new Set([...candidates, ...extraWords]));
    }

    const finalCandidates = [];
    const byLength = { 3: [], 4: [], 5: [] };
    candidates.forEach(w => {
        if (byLength[w.length]) byLength[w.length].push(w);
    });

    Object.values(byLength).forEach(arr => arr.sort());

    // Strategy: ensure at least one of each available length
    [3, 4, 5].forEach(len => {
        if (byLength[len].length > 0) {
            finalCandidates.push(byLength[len].shift());
        }
    });

    // Fill remaining with shortest-first then alpha
    const remaining = [...byLength[3], ...byLength[4], ...byLength[5]].sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });

    while (finalCandidates.length < cap && remaining.length > 0) {
        finalCandidates.push(remaining.shift());
    }

    const sortedFinal = finalCandidates.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });

    const finalSet = Array.from(new Set(sortedFinal));
    
    if (JSON.stringify(entry.subWords) !== JSON.stringify(finalSet)) {
        entry.subWords = finalSet;
        modifiedCount++;
    }
    
    if (typeof entry.sub === 'number' || !Array.isArray(entry.sub)) {
        entry.sub = entry.subWords.length;
    }

    const finalHasLen = (len) => finalSet.some(w => w.length === len);
    if (!finalHasLen(3) || !finalHasLen(4) || !finalHasLen(5)) {
        missingLengthsEntries.push(bingo);
    }
});

fs.writeFileSync(roundsPath, JSON.stringify(roundsData, null, 2));

console.log('Total entries:', roundsData.wordPool.length);
console.log('Entries modified:', modifiedCount);
console.log('Entries missing 3/4/5 lengths:', missingLengthsEntries.length);
if (missingLengthsEntries.length > 0) {
    console.log('First 15 missing:', missingLengthsEntries.slice(0, 15).join(', '));
}
