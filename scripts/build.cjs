const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
for (const name of ['index.html', 'style.css', 'assets', 'js', 'docs', 'LICENSE']) {
  fs.cpSync(path.join(root, name), path.join(out, name), {recursive: true});
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Static site built in dist/ (also works directly from index.html).');
