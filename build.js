const fs = require('node:fs');
const obfuscator = require('javascript-obfuscator');
require('dotenv').config();

const inputPath = 'src/index.js';
const outputPath = 'bin/cli.js';

fs.rmSync(outputPath.split('/')[0], { recursive: true, force: true });

let code = fs.readFileSync(inputPath, 'utf8');
code = code.replace(`require("dotenv").config();`, '');
code = code.replace('process.env.MAPLE_URL', `"${process.env.MAPLE_URL}"`);

const obfuscated = obfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: true,
  rotateStringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 5
}).getObfuscatedCode();

if (!fs.existsSync(outputPath.split('/')[0])) fs.mkdirSync(outputPath.split('/')[0]);
fs.writeFileSync(outputPath, obfuscated);
