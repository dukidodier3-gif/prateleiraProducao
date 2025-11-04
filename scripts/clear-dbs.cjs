const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function backupFile(filePath) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) return false;
  const bak = `${full}.bak`;
  fs.copyFileSync(full, bak);
  return bak;
}

function clearDb(filePath) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) {
    console.log(`${filePath} not found, skipping`);
    return;
  }

  const db = new Database(full);
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);
    console.log(`Clearing DB ${filePath} tables: ${tables.join(', ')}`);

    const transaction = db.transaction((tables) => {
      for (const t of tables) {
        try {
          db.prepare(`DELETE FROM ${t}`).run();
          console.log(` - cleared table ${t}`);
        } catch (e) {
          console.log(` - failed to clear table ${t}: ${e.message}`);
        }
      }
    });

    transaction(tables);
    // optional VACUUM to reclaim space
    try { db.exec('VACUUM'); console.log('VACUUM ok'); } catch (e) { console.log('VACUUM failed:', e.message); }
  } finally {
    db.close();
  }
}

const targets = ['welding.db','producao.db'];
for (const t of targets) {
  const bak = backupFile(t);
  console.log(bak ? `Backup created: ${bak}` : `No file to backup for ${t}`);
  clearDb(t);
}

console.log('Done. Files backed up and DBs cleared where present.');
