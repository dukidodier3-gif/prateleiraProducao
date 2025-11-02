import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }
  // Suporte a provedores que exigem SSL (ex: Neon). Se a URL incluir 'neon.tech' ou 'sslmode=require', habilitar SSL.
  const needsSSL = /neon\.tech/i.test(connectionString) || /sslmode=require/i.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const p = getPool();
  return p.query(text, params);
};

export const initPostgresSchemas = async () => {
  const p = getPool();
  // Create welding_items table if not exists
  await p.query(`
    CREATE TABLE IF NOT EXISTS welding_items (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      order_number TEXT NOT NULL,
      order_quantity INTEGER NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Create parts tables used by parts service if desired
  await p.query(`
    CREATE TABLE IF NOT EXISTS parts (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      component_type TEXT NOT NULL,
      order_number TEXT NOT NULL,
      order_quantity INTEGER NOT NULL,
      item_quantity INTEGER NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Create production tables (ordens_producao) used by ProducaoService
  await p.query(`
    CREATE TABLE IF NOT EXISTS ordens_producao (
      id SERIAL PRIMARY KEY,
      codigo TEXT,
      descricao TEXT,
      quantidade_total INTEGER DEFAULT 0,
      quantidade_produzida INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDENTE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS itens_ordem_producao (
      id SERIAL PRIMARY KEY,
      ordem_id INTEGER REFERENCES ordens_producao(id) ON DELETE CASCADE,
      codigo TEXT,
      descricao TEXT,
      tipo TEXT,
      localizacao TEXT,
      quantidade_por_engate INTEGER DEFAULT 0,
      quantidade_adicionada INTEGER DEFAULT 0,
      quantidade_disponivel INTEGER DEFAULT 0
    );
  `);
};
