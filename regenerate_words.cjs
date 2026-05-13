const fs = require("fs");

function regenerate() {
    const vocabRaw = fs.readFileSync("englishword300.md", "utf8").split(/\r?\n/);
    const vocabSet = new Set();
    vocabRaw.forEach(w => {
        const normalized = w.toLowerCase().replace(/[^a-z]/g, "").toUpperCase();
        if (normalized.length >= 3 && normalized.length <= 5) {
            vocabSet.add(normalized);
        }
    });
    const allowedWords = Array.from(vocabSet);

    const rounds = JSON.parse(fs.readFileSync("src/data/rounds.json", "utf8"));
    const caps = { simple: 15, hard: 20, hardest: 30 };

    function canForm(word, bingo) {
        const counts = {};
        for (const char of bingo) counts[char] = (counts[char] || 0) + 1;
        for (const char of word) {
            if (!counts[char]) return false;
            counts[char]--;
        }
        return true;
    }

    let emptyBingos = [];
    let nonEmptyCount = 0;

    rounds.wordPool.forEach(item => {
        const bingo = item.bingo.toUpperCase().replace(/[^A-Z]/g, "");
        let candidates = allowedWords.filter(w => w !== bingo && canForm(w, bingo));
        
        candidates.sort((a, b) => {
            if (a.length !== b.length) return a.length - b.length;
            return a.localeCompare(b);
        });

        const cap = caps[item.difficulty] || 15;
        const selected = new Set();

        const lengths = [3, 4, 5];
        lengths.forEach(len => {
            const firstOfLen = candidates.find(w => w.length === len);
            if (firstOfLen) selected.add(firstOfLen);
        });

        for (const word of candidates) {
            if (selected.size >= cap) break;
            selected.add(word);
        }

        const finalWords = Array.from(selected).sort((a, b) => {
            if (a.length !== b.length) return a.length - b.length;
            return a.localeCompare(b);
        });

        item.subWords = finalWords;
        if (typeof item.sub === "number") {
            item.sub = finalWords.length;
        }

        if (finalWords.length > 0) {
            nonEmptyCount++;
        } else {
            emptyBingos.push(item.bingo);
        }
    });

    fs.writeFileSync("src/data/rounds.json", JSON.stringify(rounds, null, 2));

    console.log(`Total entries: ${rounds.wordPool.length}`);
    console.log(`Entries with non-empty subWords: ${nonEmptyCount}`);
    console.log(`Entries empty: ${rounds.wordPool.length - nonEmptyCount}`);
    console.log("First 20 empty bingos:", emptyBingos.slice(0, 20).join(", "));
}

regenerate();
