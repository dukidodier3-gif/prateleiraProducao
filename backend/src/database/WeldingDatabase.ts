// Legado descontinuado: use Postgres (backend) ou IndexedDB (frontend)
export default class WeldingDatabase {
  static getInstance(): WeldingDatabase {
    throw new Error('WeldingDatabase (SQLite) descontinuado.');
  }
}
