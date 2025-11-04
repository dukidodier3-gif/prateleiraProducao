const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable (Neon connection string)');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Migrate welding.db -> welding_items
    const weldingPath = path.resolve('welding.db');
    if (fs.existsSync(weldingPath)) {
      const wdb = new Database(weldingPath, { readonly: true });
      const rows = wdb.prepare('SELECT * FROM welding_items').all();
      console.log(`Found ${rows.length} welding_items to migrate`);

      for (const r of rows) {
        await client.query(
          `INSERT INTO welding_items (code, order_number, order_quantity, sent_at) VALUES ($1,$2,$3,$4)`,
          [r.code, r.orderNumber || r.order_number, r.orderQuantity || r.order_quantity, r.sentAt || r.sent_at]
        );
      }

      wdb.close();
    } else {
      console.log('welding.db not found, skipping');
    }

    // Migrate parts.db if exists
    const partsPath = path.resolve('parts.db');
    if (fs.existsSync(partsPath)) {
      const pdb = new Database(partsPath, { readonly: true });
      const rows = pdb.prepare('SELECT * FROM parts').all();
      console.log(`Found ${rows.length} parts to migrate`);

      for (const p of rows) {
        await client.query(
          `INSERT INTO parts (code, component_type, order_number, order_quantity, item_quantity, location, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [p.code, p.componentType || p.component_type, p.orderNumber || p.order_number, p.orderQuantity || p.order_quantity || p.quantity, p.itemQuantity || p.item_quantity || p.quantity, p.location, p.status, p.createdAt || p.created_at]
        );
      }

      pdb.close();
    } else {
      console.log('parts.db not found, skipping');
    }

    console.log('Migration completed');
  } catch (err) {
    console.error('Migration error', err);
  } finally {
    await client.end();
  }
})();
