import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.sqlite');

const usePostgres = !!process.env.DATABASE_URL;

let sqliteDb: any;
let pgPool: any;

if (usePostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
}

export async function initDb() {
  if (usePostgres) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username TEXT,
        utm_source TEXT,
        step INTEGER DEFAULT 0,
        language TEXT,
        full_name TEXT,
        age_city TEXT,
        social_link TEXT,
        photo_file_id TEXT,
        video_file_id TEXT,
        video_ru_id TEXT,
        video_uz_id TEXT,
        lang_proficiency TEXT,
        joined_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        full_name TEXT,
        age_city TEXT,
        social_link TEXT,
        photo_file_id TEXT,
        video_file_id TEXT,
        video_ru_id TEXT,
        video_uz_id TEXT,
        lang_proficiency TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Add columns if they don't exist
    try {
      await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS video_ru_id TEXT;`);
      await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS video_uz_id TEXT;`);
      await pgPool.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_ru_id TEXT;`);
      await pgPool.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_uz_id TEXT;`);
    } catch (e) {
      console.error('Error adding columns to postgres:', e);
    }
  } else {
    sqliteDb.exec(`
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
        video_ru_id TEXT,
        video_uz_id TEXT,
        lang_proficiency TEXT,
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
        video_ru_id TEXT,
        video_uz_id TEXT,
        lang_proficiency TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Add columns if they don't exist
    try {
      sqliteDb.exec(`ALTER TABLE users ADD COLUMN video_ru_id TEXT;`);
    } catch (e) {}
    try {
      sqliteDb.exec(`ALTER TABLE users ADD COLUMN video_uz_id TEXT;`);
    } catch (e) {}
    try {
      sqliteDb.exec(`ALTER TABLE applications ADD COLUMN video_ru_id TEXT;`);
    } catch (e) {}
    try {
      sqliteDb.exec(`ALTER TABLE applications ADD COLUMN video_uz_id TEXT;`);
    } catch (e) {}
  }
}

export async function getUser(userId: number) {
  if (usePostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } else {
    const stmt = sqliteDb.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  }
}

export async function updateUser(userId: number, data: any) {
  const existing = await getUser(userId);
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  if (!existing) {
    if (usePostgres) {
      const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
      await pgPool.query(
        `INSERT INTO users (id, ${keys.join(', ')}) VALUES ($1, ${placeholders})`,
        [userId, ...values]
      );
    } else {
      const placeholders = keys.map(() => '?').join(', ');
      const stmt = sqliteDb.prepare(`INSERT INTO users (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`);
      stmt.run(userId, ...values);
    }
  } else {
    if (usePostgres) {
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await pgPool.query(
        `UPDATE users SET ${setClause} WHERE id = $${keys.length + 1}`,
        [...values, userId]
      );
    } else {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const stmt = sqliteDb.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
      stmt.run(...values, userId);
    }
  }
}

export async function createApplication(data: any) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  if (usePostgres) {
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const res = await pgPool.query(
      `INSERT INTO applications (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    return res.rows[0].id;
  } else {
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = sqliteDb.prepare(`INSERT INTO applications (${keys.join(', ')}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
  }
}

export async function getApplications(): Promise<any[]> {
  if (usePostgres) {
    const res = await pgPool.query(`
      SELECT a.*, u.username 
      FROM applications a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC
    `);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(`
      SELECT a.*, u.username 
      FROM applications a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC
    `);
    return stmt.all();
  }
}

export async function updateApplicationStatus(appId: string | number, status: string) {
  if (usePostgres) {
    await pgPool.query('UPDATE applications SET status = $1 WHERE id = $2', [status, appId]);
  } else {
    const stmt = sqliteDb.prepare('UPDATE applications SET status = ? WHERE id = ?');
    stmt.run(status, appId);
  }
}

export async function getStats() {
  if (usePostgres) {
    const totalUsers = await pgPool.query('SELECT COUNT(*) as count FROM users');
    const totalApps = await pgPool.query('SELECT COUNT(*) as count FROM applications');
    const pendingApps = await pgPool.query("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'");
    const approvedApps = await pgPool.query("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'");
    const rejectedApps = await pgPool.query("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'");
    const todayApps = await pgPool.query("SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = CURRENT_DATE");
    const funnelData = await pgPool.query('SELECT step, COUNT(*) as count FROM users GROUP BY step ORDER BY step');

    return {
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalApps: parseInt(totalApps.rows[0].count),
      todayApps: parseInt(todayApps.rows[0].count),
      pendingApps: parseInt(pendingApps.rows[0].count),
      approvedApps: parseInt(approvedApps.rows[0].count),
      rejectedApps: parseInt(rejectedApps.rows[0].count),
      funnel: funnelData.rows.map((r: any) => ({ step: r.step, count: parseInt(r.count) }))
    };
  } else {
    const totalUsers = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() as {count: number};
    const totalApps = sqliteDb.prepare('SELECT COUNT(*) as count FROM applications').get() as {count: number};
    const pendingApps = sqliteDb.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'").get() as {count: number};
    const approvedApps = sqliteDb.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'").get() as {count: number};
    const rejectedApps = sqliteDb.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'").get() as {count: number};
    const todayApps = sqliteDb.prepare("SELECT COUNT(*) as count FROM applications WHERE date(created_at) = date('now')").get() as {count: number};
    const funnelData = sqliteDb.prepare('SELECT step, COUNT(*) as count FROM users GROUP BY step ORDER BY step').all() as {step: number, count: number}[];

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
}

export async function clearData() {
  if (usePostgres) {
    await pgPool.query('DELETE FROM applications');
    await pgPool.query('DELETE FROM users');
  } else {
    sqliteDb.exec('DELETE FROM applications');
    sqliteDb.exec('DELETE FROM users');
  }
}

export async function getBotTexts() {
  if (usePostgres) {
    const res = await pgPool.query("SELECT value FROM settings WHERE key = 'bot_texts'");
    const row = res.rows[0];
    if (row && row.value) {
      try { return JSON.parse(row.value); } catch (e) { return null; }
    }
    return null;
  } else {
    const stmt = sqliteDb.prepare("SELECT value FROM settings WHERE key = 'bot_texts'");
    const row = stmt.get() as {value: string} | undefined;
    if (row && row.value) {
      try { return JSON.parse(row.value); } catch (e) { return null; }
    }
    return null;
  }
}

export async function updateBotTexts(texts: any) {
  if (usePostgres) {
    await pgPool.query(
      "INSERT INTO settings (key, value) VALUES ('bot_texts', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [JSON.stringify(texts)]
    );
  } else {
    const stmt = sqliteDb.prepare("INSERT INTO settings (key, value) VALUES ('bot_texts', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    stmt.run(JSON.stringify(texts));
  }
}
