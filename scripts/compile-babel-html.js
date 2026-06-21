const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const pages = [
  {
    htmlPath: path.join(__dirname, '..', 'index.html'),
    outJsPath: path.join(__dirname, '..', 'app.js'),
    scriptSrc: 'app.js'
  },
  {
    htmlPath: path.join(__dirname, '..', 'backend', 'index.html'),
    outJsPath: path.join(__dirname, '..', 'backend', 'app.js'),
    scriptSrc: 'app.js'
  }
];

const transformOptions = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: ['@babel/plugin-proposal-class-properties'],
  sourceMaps: false
};

for (const page of pages) {
  const html = fs.readFileSync(page.htmlPath, 'utf8');
  const scriptStart = html.indexOf('<script type="text/babel"');
  if (scriptStart === -1) {
    console.log('No text/babel script found in', page.htmlPath);
    continue;
  }
  const startTagEnd = html.indexOf('>', scriptStart);
  if (startTagEnd === -1) throw new Error('Malformed script start tag');
  const endTag = html.indexOf('</script>', startTagEnd);
  if (endTag === -1) throw new Error('Missing closing </script>');

  const scriptContent = html.slice(startTagEnd + 1, endTag);
  const compiled = babel.transformSync(scriptContent, transformOptions);
  fs.writeFileSync(page.outJsPath, compiled.code, 'utf8');

  const newHtml = html.slice(0, scriptStart)
    + `<script src="${page.scriptSrc}"></script>`
    + html.slice(endTag + '</script>'.length);
  fs.writeFileSync(page.htmlPath, newHtml, 'utf8');
  console.log('Compiled', page.htmlPath, '->', page.outJsPath);
}
