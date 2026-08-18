const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const { analyzeAI } = require('./ai-detect');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());

const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

app.post('/extract', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const exiftoolCmd = process.platform === 'win32' ? 'exiftool.exe' : 'exiftool';
  const args = ['-a', '-u', '-g1', filePath];

  const child = spawn(exiftoolCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('close', (code) => {
    try {
      fs.unlinkSync(filePath);
    } catch (_e) {}
    if (code !== 0) return res.status(500).json({ error: stderr || `exiftool exited ${code}` });
    const ai = analyzeAI(stdout);
    res.json({ metadata: stdout, ai });
  });

  child.on('error', (err) => {
    try {
      fs.unlinkSync(filePath);
    } catch (_e) {}
    res.status(500).json({ error: err.message });
  });
});

app.get('/', (req, res) => res.send('ExifTool backend running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ExifTool backend listening on ${port}`));
