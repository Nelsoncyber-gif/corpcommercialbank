const fs = require('fs');
const parser = require('@babel/parser');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if (!m) throw new Error('No script block found');
const code = m[1];
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('PARSE_OK');
} catch (e) {
  console.error('PARSE_ERROR');
  console.error('message:', e.message);
  console.error('line:', e.loc && e.loc.line);
  console.error('column:', e.loc && e.loc.column);
  const lines = code.split('\n');
  const line = (e.loc && e.loc.line) || 1;
  const start = Math.max(1, line - 5);
  const end = Math.min(lines.length, line + 5);
  for (let i = start; i <= end; i++) {
    const marker = i === line ? '>> ' : '   ';
    console.log(String(i).padStart(4) + ' ' + marker + lines[i - 1]);
  }
}
