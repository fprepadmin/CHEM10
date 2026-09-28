const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/gu;

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (emojiRegex.test(content)) {
    console.log('Cleaning emojis from:', filePath);
    let newContent = content
      .replace(/👋/g, '')
      .replace(/📥/g, '')
      .replace(/🎯/g, '')
      .replace(/📖/g, '')
      .replace(/⚡/g, '')
      .replace(/🧪/g, '')
      .replace(/⚛️/g, '')
      .replace(/📚/g, '')
      .replace(/✨/g, '')
      .replace(/🚀/g, '')
      .replace(/💡/g, '')
      .replace(/📝/g, '')
      .replace(/🔥/g, '')
      .replace(/🏆/g, '')
      .replace(/👏/g, '')
      .replace(/✅/g, '')
      .replace(/❌/g, '')
      .replace(/🔍/g, '')
      .replace(/⭐/g, '')
      .replace(/🌟/g, '')
      .replace(/🎉/g, '')
      .replace(/📊/g, '')
      .replace(/📈/g, '')
      .replace(/⚙️/g, '')
      .replace(/🛡️/g, '')
      .replace(/🔒/g, '')
      .replace(/🔑/g, '')
      .replace(/🕒/g, '')
      .replace(/⏳/g, '')
      .replace(/📋/g, '')
      .replace(/📌/g, '')
      .replace(/⚠️/g, '')
      .replace(/🚨/g, '')
      .replace(/🎓/g, '')
      .replace(/🏫/g, '')
      .replace(/💻/g, '')
      .replace(/🏷️/g, '')
      .replace(/📄/g, '')
      .replace(/🗑️/g, '')
      .replace(/✏️/g, '')
      .replace(/🤖/g, '')
      .replace(/🔔/g, '')
      .replace(/🌐/g, '')
      .replace(emojiRegex, '');
    
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      cleanFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Finished emoji scan and cleanup.');
