import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const inputPath = path.resolve(projectRoot, 'auth_codes.txt');
const outputPath = path.resolve(projectRoot, 'worker', 'auth-codes-kv-bulk.json');

const toHalfWidth = (rawText) => {
  return String(rawText || '')
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/\u3000/g, ' ');
};

const normalizeCode = (rawCode) => {
  return toHalfWidth(rawCode)
    .replace(/^\uFEFF/, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

const text = fs.readFileSync(inputPath, 'utf-8');
const codes = text
  .split(/\r?\n/)
  .map((line) => normalizeCode(line))
  .filter((line) => line.length > 0);

const uniqueCodes = Array.from(new Set(codes));
const kvItems = uniqueCodes.map((code) => ({
  key: code,
  value: '1',
}));

fs.writeFileSync(outputPath, JSON.stringify(kvItems), 'utf-8');
console.log(`codes=${codes.length} unique=${uniqueCodes.length} output=${outputPath}`);
