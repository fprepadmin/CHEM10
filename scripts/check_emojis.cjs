const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..', 'src');

// Comprehensive Unicode Emoji range
const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

let foundCount = 0;
function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(emojiRegex);
      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} emojis in ${file}:`, matches.slice(0, 10).join(' '));
        foundCount += matches.length;
      }
    }
  }
}

checkDir(srcDir);
console.log(`Total remaining emojis found: ${foundCount}`);
