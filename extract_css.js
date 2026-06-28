const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'times-v4', 'frontend', 'src', 'index.css');

const content = fs.readFileSync(htmlPath, 'utf8');

const styleStart = content.indexOf('<style>');
const styleEnd = content.indexOf('</style>', styleStart);

if (styleStart !== -1 && styleEnd !== -1) {
  const css = content.slice(styleStart + 7, styleEnd);
  fs.writeFileSync(cssPath, css);
  console.log('Successfully extracted CSS to index.css');
} else {
  console.log('Could not find <style> tags.');
}
