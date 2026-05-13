const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/rounds.json", "utf8"));
console.log(JSON.stringify(data.levels[0], null, 2));
