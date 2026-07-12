const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('colors.') && !content.includes('import { colors }') && !content.includes('import { colors,')) {
    // We need to add import { colors } from "@/constants/colors";
    const importStatement = 'import { colors } from "@/constants/colors";\n';
    
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
      content = importStatement + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Added colors import to ${file}`);
  }
}
