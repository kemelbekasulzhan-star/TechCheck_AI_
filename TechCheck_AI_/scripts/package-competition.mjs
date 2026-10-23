// Produces a new, independent Windows x64 demo folder. Never copies private env files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
const sourceTarget = process.argv[3];
if (!target || !sourceTarget || !path.isAbsolute(target) || !path.isAbsolute(sourceTarget)) throw new Error('Provide two absolute output directories.');
for (const output of [target, sourceTarget]) {
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new output folder.');
  if (path.resolve(output).startsWith(root + path.sep)) throw new Error('Place output outside the working project.');
}
const folders = ['src', 'public', 'scripts', 'tests', 'competition'];
const files = fs.readdirSync(root).filter(file => /\.(md|txt|cmd|json|ts)$/.test(file) && file !== 'tsconfig.tsbuildinfo');
files.push('.gitignore', '.env.example');
for (const output of [target, sourceTarget]) {
  fs.mkdirSync(output);
  for (const folder of folders) fs.cpSync(path.join(root, folder), path.join(output, folder), { recursive: true, dereference: true });
  for (const file of files) fs.copyFileSync(path.join(root, file), path.join(output, file));
}
console.log('Sources and presentation copied; private settings excluded.');
fs.cpSync(fs.realpathSync(path.join(root, 'node_modules')), path.join(target, 'node_modules'), { recursive: true, dereference: true });
console.log('Independent dependencies copied.');
const build = fs.realpathSync(path.join(root, '.next'));
fs.cpSync(build, path.join(target, '.next'), { recursive: true, dereference: true,
  filter: source => { const relative = path.relative(build, source); return relative !== 'cache' && !relative.startsWith('cache' + path.sep); },
});
fs.mkdirSync(path.join(target, 'runtime'));
fs.copyFileSync(process.execPath, path.join(target, 'runtime/node.exe'));
const license = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`);
if (!license.ok) throw new Error('Could not download the Node.js redistribution license.');
fs.writeFileSync(path.join(target, 'runtime/LICENSE-node.txt'), await license.text());
fs.writeFileSync(path.join(target, 'PORTABLE-INFO.txt'), `TechCheck competition copy. Windows ${process.arch}. Node.js ${process.version}.\nRun Start-Demo.cmd. No installation or internet is needed for the built-in examples.\nOpenAI key and personal settings are excluded.\nUnzip the whole archive before running it.\n`);
console.log('Ready folder: ' + target);
console.log('Source folder: ' + sourceTarget);
