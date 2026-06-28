const fs = require('fs');
const path = 'd:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v3-test\\index.html';
let content = fs.readFileSync(path, 'utf8');

const targetStr = "const API_URL = 'https://script.google.com/macros/s/AKfycbykwx2ubeJVp5Uy16OrHw9SMzHtKchiM0I7a-t3D_D45RJJ9G6EXrJtlL8Cl12ySdqndg/exec';";
if (content.includes(targetStr)) {
  content = content.replace(targetStr, "const API_URL = '/api/rpc';");
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched API_URL in index.html");
} else {
  console.log("Target string not found in index.html! Maybe it was already replaced?");
}
