// Deprecated SQLite-based WeldingDatabase
// This file no longer uses SQLite. The project now uses Postgres via PostgresClient.
// Keep a stub to avoid import errors in case any leftover code imports this file.

class WeldingDatabase {
  static getInstance(): WeldingDatabase {
    throw new Error('WeldingDatabase (SQLite) foi removido. Use Postgres via database/PostgresClient.');
  }
}

export default WeldingDatabase;
