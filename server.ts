import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getStats, getApplications, updateApplicationStatus, clearData, getUser } from './server/db.js';
import { initBot, stopBot, isBotRunning, notifyUser, getTelegramFileUrl } from './server/bot.js';

import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  initDb();

  // Hardcoded bot token as requested by the user
  const BOT_TOKEN = '8739742447:AAHrHEYWdn3-f6oBE2IWNkDU7PpO62pquZs';
  
  // Start the bot automatically
  try {
    await initBot(BOT_TOKEN);
    console.log('Bot started automatically with hardcoded token.');
  } catch (error) {
    console.error('Failed to start bot automatically:', error);
  }

  app.get('/api/status', (req, res) => {
    res.json({ running: isBotRunning() });
  });

  app.get('/api/file/:fileId', async (req, res) => {
    try {
      const url = await getTelegramFileUrl(req.params.fileId);
      res.redirect(url);
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  });

  app.post('/api/start-bot', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    
    try {
      await initBot(token);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stop-bot', async (req, res) => {
    try {
      await stopBot();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/clear-data', async (req, res) => {
    try {
      await clearData();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/applications', async (req, res) => {
    try {
      const apps = await getApplications();
      res.json(apps);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post('/api/applications/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    try {
      await updateApplicationStatus(id, status);
      
      // Get the application to find the user_id
      const apps = await getApplications();
      const app = apps.find(a => a.id === id);
      
      if (app && app.user_id) {
        await notifyUser(app.user_id, status);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/bot-texts', async (req, res) => {
    try {
      const { getBotTexts } = await import('./server/db.js');
      const texts = await getBotTexts();
      res.json(texts || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bot-texts', async (req, res) => {
    try {
      const { updateBotTexts } = await import('./server/db.js');
      const { reloadTexts } = await import('./server/bot.js');
      await updateBotTexts(req.body);
      await reloadTexts();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/download-python', (req, res) => {
    const pythonBotPath = path.join(process.cwd(), 'python_bot');
    res.attachment('dinay_bot_python.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });
    archive.pipe(res);
    archive.directory(pythonBotPath, false);
    archive.finalize();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
