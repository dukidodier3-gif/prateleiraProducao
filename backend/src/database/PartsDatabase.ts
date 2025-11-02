// Deprecated SQLite-based PartsDatabase
// Use Postgres via database/PostgresClient instead.

class PartsDatabase {
  static getInstance(): PartsDatabase {
    throw new Error('PartsDatabase (SQLite) foi removido. Use Postgres via database/PostgresClient.');
  }
}

export default PartsDatabase;