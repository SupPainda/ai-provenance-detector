#!/usr/bin/env node
const { spawn } = require('child_process');
const { basename, dirname, extname, join } = require('path');
const { writeFileSync } = require('fs');
const { analyzeAI } = require('./ai-detect');

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`Usage: node extract-metadata.js [options] <image-file>...

Options:
  -o, --output <path>   Write metadata to this output file or directory
  -h, --help            Show this help text

Examples:
  node extract-metadata.js "C:\\Users\\Lenovo\\Pictures\\photo.jpg"
  node extract-metadata.js -o "photo.exiftool.txt" "photo.jpg"
  node extract-metadata.js -o ./output "photo.jpg" "other.png"
`);
  process.exit(0);
}

let outputPath = null;
const files = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '-o' || arg === '--output') {
    outputPath = args[i + 1];
    if (!outputPath) {
      console.error('Error: missing path after -o / --output.');
      process.exit(1);
    }
    i += 1;
    continue;
  }
  files.push(arg);
}

if (files.length === 0) {
  console.error('Error: no image file specified.');
  process.exit(1);
}

const exiftoolCmd = process.platform === 'win32' ? 'exiftool.exe' : 'exiftool';

function runExiftool(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(exiftoolCmd, ['-a', '-u', '-g1', filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `ExifTool failed with exit code ${code}`));
      }
      resolve(stdout);
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function run() {
  for (const filePath of files) {
    try {
      const fileName = basename(filePath, extname(filePath));
      const defaultOutput = outputPath
        ? outputPath.endsWith('.txt') || outputPath.endsWith('.exiftool.txt')
          ? outputPath
          : join(outputPath, `${fileName}.exiftool.txt`)
        : join(dirname(filePath), `${fileName}.exiftool.txt`);

      const normalizedOutput =
        outputPath && files.length === 1 && !outputPath.endsWith('.txt') && !outputPath.endsWith('.exiftool.txt')
          ? join(outputPath, `${fileName}.exiftool.txt`)
          : defaultOutput;

      console.log(`Extracting metadata from: ${filePath}`);
      const metadataText = await runExiftool(filePath);
      writeFileSync(normalizedOutput, metadataText, 'utf8');
      console.log(`Written metadata to: ${normalizedOutput}`);

      // AI detection analysis
      const ai = analyzeAI(metadataText);
      console.log('');
      if (ai.confidence === 'HIGH') {
        console.log(`AI Detection: AI GENERATED (HIGH confidence)`);
        if (ai.generator) console.log(`Generator:    ${ai.generator}`);
        ai.reasons.forEach((r) => {
          console.log(`  - ${r}`);
        });
      } else if (ai.confidence === 'MEDIUM') {
        console.log(`AI Detection: MAYBE AI (MEDIUM confidence)`);
        if (ai.generator) console.log(`Generator:    ${ai.generator}`);
        ai.reasons.forEach((r) => {
          console.log(`  - ${r}`);
        });
      } else {
        console.log(`AI Detection: NO PROOF (LOW confidence)`);
        if (ai.metadataStripped) {
          console.log(`  - Metadata may have been stripped`);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error('ExifTool binary not found. Install ExifTool and ensure it is on your PATH.');
      } else {
        console.error(`Error processing ${filePath}: ${error.message}`);
      }
      process.exit(1);
    }
  }
}

run();
