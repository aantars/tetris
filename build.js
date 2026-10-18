// Builds the single self-contained tetris.html: node build.js
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');

const html = read('src/index.template.html')
  .replace('/*{{LOGIC}}*/', () => read('src/logic.js'))
  .replace('/*{{REPEAT}}*/', () => read('src/repeat.js'))
  .replace('/*{{MAIN}}*/', () => read('src/main.js'));

fs.writeFileSync(path.join(__dirname, 'tetris.html'), html);
console.log('Wrote tetris.html');
