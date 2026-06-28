const fs = require('fs');
const content = fs.readFileSync('d:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v3-test\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('google.script.run')) {
    console.log(`Line ${idx + 1}: ${line.trim().substring(0, 100)}`);
  }
});
