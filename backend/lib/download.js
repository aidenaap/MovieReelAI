import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin');
const YTDLP = path.join(BIN, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const DOWNLOADS = path.join(__dirname, '..', 'downloads');

function ytdlp(url, format = 'mp4') {
  fs.mkdirSync(DOWNLOADS, { recursive: true });
    const { args: fmtArgs, suffix = '' } = FORMATS[format];
    const args = [
    '--no-playlist', ...fmtArgs, '--ffmpeg-location', BIN,
    '--restrict-filenames', '-o', path.join(DOWNLOADS, `%(title).80B [%(id)s]${suffix}.%(ext)s`),
    '--print', 'after_move:filepath', '--no-simulate', url
  ];
  return new Promise((resolve, reject) => {
    const p = spawn(YTDLP, args, { windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      const file = out.trim().split(/\r?\n/).pop();
      if (code === 0 && file && fs.existsSync(file)) return resolve(file);
      const lines = err.trim().split(/\r?\n/);
      const msg = lines.filter((l) => l.startsWith('ERROR')).join(' ') || lines.slice(-3).join(' ');
      reject(new Error(`yt-dlp exited ${code}: ${msg || out.trim().slice(-300) || 'no output'}`));
    });
  });
}

const FORMATS = {
  mp4: { args: ['-t', 'mp4'] },
  mp3: { args: ['-x', '--audio-format', 'mp3', '--audio-quality', '0'] },
  'mp3-320': {
    suffix: '-320',
    args: ['-x', '--audio-format', 'mp3', '--audio-quality', '320K',
      '--postprocessor-args', 'ExtractAudio:-compression_level 0']
  },
  wav: { args: ['-x', '--audio-format', 'wav'] }
};

export const downloadRouter = express.Router();

downloadRouter.post('/download', express.json(), async (req, res) => {
  const { url, format = 'mp4' } = req.body ?? {};
  if (!/^https?:\/\//.test(url ?? '')) return res.status(400).json({ error: 'Invalid URL' });
  if (!FORMATS[format]) return res.status(400).json({ error: 'Invalid format' });
  try {
    res.json({ file: path.basename(await ytdlp(url, format)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

downloadRouter.get('/download/:file', (req, res) => {
  const file = path.join(DOWNLOADS, path.basename(req.params.file));
  if (!fs.existsSync(file)) return res.sendStatus(404);
  res.download(file);
});