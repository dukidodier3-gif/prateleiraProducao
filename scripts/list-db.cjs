const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

function listDb(dbPath) {
  const full = path.resolve(dbPath);
  if (!fs.existsSync(full)) {
    console.log(`## ${dbPath} - NOT FOUND`);
    return;
  }

  try {
    const db = new Database(full, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    console.log(`## ${dbPath} - tables: ${tables.join(', ')}`);

    for (const t of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${t} LIMIT 1000`).all();
        console.log(`-- table: ${t} (${rows.length} rows)`);
        console.log(JSON.stringify(rows, null, 2));
      } catch (e) {
        console.log(`-- table: ${t} - error reading rows: ${e.message}`);
      }
    }

    db.close();
  } catch (e) {
    console.error(`Error opening ${dbPath}:`, e.message);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node list-db.cjs <dbfile1> [dbfile2] ...');
  process.exit(1);
}

for (const a of args) {
  listDb(a);
}
