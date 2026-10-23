// Run with: node scripts/generate-static-translations.js
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const languagesStart = html.indexOf('const languages = [');
const languagesEnd = html.indexOf('];', languagesStart) + 2;
const translationsStart = html.indexOf('const translations = {', languagesEnd);
const providerStart = html.indexOf('// Language Provider Component', translationsStart);
const translationsEnd = html.lastIndexOf('};', providerStart) + 2;
const declarations = html.slice(languagesStart, languagesEnd)
  + '\n' + html.slice(translationsStart, translationsEnd)
  + '\nreturn { languages, translations };';
const { languages, translations } = new Function(declarations)();
const outputPath = 'locale-translations.js';

function loadGenerated() {
  if (!fs.existsSync(outputPath)) return {};
  const source = fs.readFileSync(outputPath, 'utf8');
  const assignment = 'window.STATIC_TRANSLATIONS = ';
  const start = source.indexOf(assignment);
  const end = source.lastIndexOf(';');
  if (start < 0 || end < start) throw new Error(`Cannot read generated data from ${outputPath}`);
  return JSON.parse(source.slice(start + assignment.length, end));
}

function saveGenerated(result) {
  fs.writeFileSync(
    outputPath,
    `// Auto-generated static translations\nwindow.STATIC_TRANSLATIONS = ${JSON.stringify(result, null, 2)};\n`,
    'utf8'
  );
}

let placeholderId = 0;

function maskPlaceholders(text) {
  const map = [];
  const masked = text.replace(/\{([^{}]+)\}/g, (_, name) => {
    const token = `991${++placeholderId}189`;
    map.push([token, `{${name}}`]);
    return token;
  });
  return { masked, map };
}

function unmaskPlaceholders(text, map) {
  let output = text;
  for (const [token, original] of map) {
    output = output.includes(token)
      ? output.split(token).join(original)
      : `${output} ${original}`;
  }
  return output;
}

async function translateOne(text, targetLang, retries = 3) {
  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: targetLang, dt: 't', q: text });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          if (attempt === retries) throw new Error(`HTTP ${response.status} after ${retries} attempts`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      return (payload[0] || []).map(part => part[0] || '').join('');
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw new Error(`No translation returned for ${targetLang}`);
}

async function translateBatch(entries, targetLang) {
  const output = {};
  for (const entry of entries) {
    const { masked, map } = maskPlaceholders(entry.text);
    const translated = await translateOne(masked, targetLang);
    output[entry.key] = unmaskPlaceholders(translated, map);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return output;
}

(async () => {
  const englishKeys = Object.keys(translations.en);
  const result = loadGenerated();
  const languagesToFill = languages.filter(language => language.code !== 'en');

  for (const language of languagesToFill) {
    const existing = translations[language.code] || {};
    const generated = result[language.code] || {};
    const missing = englishKeys.filter(key => existing[key] === undefined && generated[key] === undefined);
    if (missing.length === 0) {
      console.log(`${language.code} already complete`);
      continue;
    }
    console.log(`${language.code}: translating ${missing.length} missing keys...`);

    const entries = missing.map(key => ({ key, text: translations.en[key] }));
    const translated = { ...generated };
    const chunkSize = 20;
    for (let offset = 0; offset < entries.length; offset += chunkSize) {
      const chunk = entries.slice(offset, offset + chunkSize);
      Object.assign(translated, await translateBatch(chunk, language.code));
      result[language.code] = translated;
      saveGenerated(result);
      process.stdout.write(`   ${Math.min(offset + chunkSize, entries.length)}/${entries.length}\r`);
    }
    result[language.code] = translated;
    saveGenerated(result);
    console.log(`\n${language.code} done (${Object.keys(translated).length} strings)`);
  }

  saveGenerated(result);

  const total = Object.values(result).reduce((sum, locale) => sum + Object.keys(locale).length, 0);
  console.log(`\nWrote locale-translations.js with ${total} strings across ${Object.keys(result).length} locales`);
})().catch(error => {
  console.error('Translation generation failed:', error);
  process.exitCode = 1;
});