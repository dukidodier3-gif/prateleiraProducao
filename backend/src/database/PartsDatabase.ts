// Arquivo legado (SQLite no backend) descontinuado. Persistência migrada para Postgres (quando backend) ou IndexedDB (frontend).
export default class PartsDatabase {
  static getInstance(): PartsDatabase {
    throw new Error('PartsDatabase (SQLite) descontinuado. Use Postgres ou IndexedDB.');
  }
}