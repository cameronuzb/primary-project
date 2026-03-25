import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Initialize SQLite database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      utm_source TEXT,
      step INTEGER DEFAULT 0,
      language TEXT,
      full_name TEXT,
      age_city TEXT,
      social_link TEXT,
      photo_file_id TEXT,
      video_file_id TEXT,
      joined_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT,
      age_city TEXT,
      social_link TEXT,
      photo_file_id TEXT,
      video_file_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function getUser(userId: number) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(userId);
}

export async function updateUser(userId: number, data: any) {
  // Check if user exists
  const existing = await getUser(userId);
  
  if (!existing) {
    // Insert new user
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const stmt = db.prepare(`INSERT INTO users (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`);
    stmt.run(userId, ...values);
  } else {
    // Update existing user
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    
    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
    stmt.run(...values, userId);
  }
}

export async function createApplication(data: any) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const stmt = db.prepare(`INSERT INTO applications (${keys.join(', ')}) VALUES (${placeholders})`);
  const info = stmt.run(...values);
  return info.lastInsertRowid;
}

export async function getApplications(): Promise<any[]> {
  const stmt = db.prepare('SELECT * FROM applications ORDER BY created_at DESC');
  return stmt.all();
}

export async function updateApplicationStatus(appId: string | number, status: string) {
  const stmt = db.prepare('UPDATE applications SET status = ? WHERE id = ?');
  stmt.run(status, appId);
}

export async function getStats() {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as {count: number};
  const totalApps = db.prepare('SELECT COUNT(*) as count FROM applications').get() as {count: number};
  
  const pendingApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'").get() as {count: number};
  const approvedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'").get() as {count: number};
  const rejectedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'").get() as {count: number};
  
  const todayApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE date(created_at) = date('now')").get() as {count: number};

  const funnelData = db.prepare('SELECT step, COUNT(*) as count FROM users GROUP BY step ORDER BY step').all() as {step: number, count: number}[];

  return {
    totalUsers: totalUsers.count,
    totalApps: totalApps.count,
    todayApps: todayApps.count,
    pendingApps: pendingApps.count,
    approvedApps: approvedApps.count,
    rejectedApps: rejectedApps.count,
    funnel: funnelData
  };
}

export async function clearData() {
  db.exec('DELETE FROM applications');
  db.exec('DELETE FROM users');
}

export async function getBotTexts() {
  const stmt = db.prepare("SELECT value FROM settings WHERE key = 'bot_texts'");
  const row = stmt.get() as {value: string} | undefined;
  
  if (row && row.value) {
    try {
      return JSON.parse(row.value);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function updateBotTexts(texts: any) {
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES ('bot_texts', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  stmt.run(JSON.stringify(texts));
}
