import fs from 'fs';
import path from 'path';

const roundsPath = path.join(process.cwd(), 'src/data/rounds.json');
const commonWordsPath = path.join(process.cwd(), 'google-10000-english.txt');

if (!fs.existsSync(roundsPath)) {
    console.error('rounds.json not found');
    process.exit(1);
}

const rounds = JSON.parse(fs.readFileSync(roundsPath, 'utf8'));
let commonWords = new Set();
if (fs.existsSync(commonWordsPath)) {
    const content = fs.readFileSync(commonWordsPath, 'utf8');
    content.split(/\r?\n/).forEach(word => {
        if (word.trim()) commonWords.add(word.trim().toLowerCase());
    });
} else {
    console.warn('Common words file not found');
}

const coreBingos = [
    'PLANET','GARDEN','FLOWER','BRIGHT','STREAK','BASKET','STRONG','MANTEL',
    'SQUARE','DANGER','TRAVEL','ROCKET','BRIDGE','WINDOW','SUMMER','WINTER',
    'ORANGE','SILVER','GUITAR','SPRING','ACTION','DREAMS','PHONES','CLOUDS',
    'QUARTZ','WIZARD','ZENITH','NATURE'
];

const curatedKeepSet = new Set();
rounds.wordPool.forEach(item => {
    if (coreBingos.includes(item.bingo.toUpperCase())) {
        const sub = item.subWords || item.sub;
        if (Array.isArray(sub)) {
            sub.forEach(w => curatedKeepSet.add(w.toUpperCase()));
        }
    }
});

console.log(`Curated keep set size: ${curatedKeepSet.size}`);

let entriesChanged = 0;
let totalRemovedCount = 0;
let removedWords = [];

rounds.wordPool.forEach(item => {
    const bingo = item.bingo.toUpperCase();
    const originalSub = Array.isArray(item.subWords) ? item.subWords : (Array.isArray(item.sub) ? item.sub : []);
    
    let normalized = originalSub
        .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
        .filter(w => w.length >= 3 && w.length <= 6 && w !== bingo);
    
    normalized = [...new Set(normalized)];

    const filtered = normalized.filter(w => {
        return commonWords.has(w.toLowerCase()) || curatedKeepSet.has(w.toUpperCase());
    });

    const sortFn = (a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    };

    let finalWords;
    if (filtered.length < 5) {
        finalWords = normalized.sort(sortFn).slice(0, 5);
    } else {
        finalWords = filtered.sort(sortFn);
    }

    const currentSubWords = item.subWords || [];
    if (JSON.stringify(currentSubWords) !== JSON.stringify(finalWords)) {
        entriesChanged++;
    }

    const finalSet = new Set(finalWords);
    normalized.forEach(w => {
        if (!finalSet.has(w)) {
          totalRemovedCount++;
          if (removedWords.length < 20) {
              removedWords.push(w);
          }
        }
    });

    item.subWords = finalWords;
    item.sub = finalWords.length;
});

fs.writeFileSync(roundsPath, JSON.stringify(rounds, null, 2));

console.log(`entries changed: ${entriesChanged}`);
console.log(`total removed: ${totalRemovedCount}`);
console.log(`first 20 removed words: ${removedWords.slice(0, 20).join(', ')}`);
