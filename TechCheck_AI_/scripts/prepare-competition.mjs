import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'competition');
fs.mkdirSync(directory, { recursive: true });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const markdown = fs.readFileSync(path.join(directory, 'Presentation-KK.md'), 'utf8');
const text = markdown.replace(/^#{1,3} /gm, '');
fs.writeFileSync(path.join(directory, 'Presentation-KK.txt'), '\uFEFF' + text);
const content = markdown.split(/\r?\n/).map(line => {
  const heading = /^(#{1,3}) (.+)$/.exec(line);
  if (heading) return `<h${heading[1].length}>${escape(heading[2])}</h${heading[1].length}>`;
  if (!line.trim()) return '';
  return `<p${line.startsWith('- ') ? ' class="bullet"' : ''}>${escape(line)}</p>`;
}).join('\n');
const styles = `body{margin:0;background:#f2f5f9;color:#16243b;font:18px/1.7 "Segoe UI",Arial,sans-serif}main{max-width:900px;margin:40px auto;padding:48px;background:white;border-radius:18px}h1{font-size:34px;line-height:1.25}h2{margin-top:48px;padding-top:24px;border-top:2px solid #dce5ef;font-size:25px;line-height:1.35}h3{font-size:20px;margin-top:32px}p{margin:12px 0}.bullet{margin:4px 0;padding-left:16px}a{color:#1359ad}img{display:block;width:100%;height:auto;border:1px solid #dce5ef;border-radius:8px}small{display:block;color:#52647b}button{padding:10px 18px;border:0;border-radius:8px;background:#153969;color:#fff;font:inherit;cursor:pointer}@media(max-width:700px){main{margin:0;padding:24px;border-radius:0}h1{font-size:28px}}@media print{body{background:white;font-size:11pt}main{margin:0;padding:0;max-width:none}button{display:none}h2,h3{break-after:avoid}img{max-height:220mm;object-fit:contain}p{orphans:3;widows:3}}`;
function page(title, body) { return `<!doctype html><html lang="kk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${styles}</style><main>${body}</main></html>`; }
fs.writeFileSync(path.join(directory, 'Presentation-KK.html'), page('TechCheck AI — қазақша қорғау мәтіні', '<button onclick="window.print()">Басып шығару / PDF сақтау</button>' + content));
const shots = [
  ['1440-home.png', '1. Қосымшаның басты беті'],
  ['1440-documents.png', '2. Оқу мысалының бастапқы құжаттары'],
  ['1440-requirements.png', '3. Талаптарды тексеру және растау'],
  ['1440-report.png', '4. А мысалы: 3 сәйкестік, 2 сәйкессіздік, 1 жетіспейтін мәлімет'],
  ['1440-evidence.png', '5. Жиілік бойынша бастапқы үзінділер'],
];
for (const [file] of shots) fs.copyFileSync(path.join(root, 'test-results', file), path.join(directory, file));
fs.copyFileSync(path.join(root, 'test-results/report.pdf'), path.join(directory, 'Report-example.pdf'));
fs.writeFileSync(path.join(directory, 'Offline-Demo.html'), page('TechCheck — сақтық көрсетілім', `<h1>TechCheck AI: сақтық көрсетілім</h1><p>Бұл — тексеру кезінде алдын ала сақталған экрандар. Мұнда жаңа есеп орындалмайды. Файл интернетсіз және жергілікті серверсіз ашылады.</p><p><a href="Presentation-KK.html">Қазақша қорғау мәтіні</a> · <a href="Report-example.pdf">Сақталған PDF-есеп</a></p><small>Экрандарда А мысалының бастапқы 3 / 2 / 1 нәтижесі көрсетілген. PDF-есепте жиілік талабы 60 Гц болып өзгертілгеннен кейінгі 4 / 1 / 1 нәтижесі сақталған.</small>${shots.map(([file, title]) => `<h2>${title}</h2><img src="${file}" alt="${title}" loading="lazy">`).join('')}`));
console.log('Prepared Kazakh presentation text, offline screenshots and backup report.');
