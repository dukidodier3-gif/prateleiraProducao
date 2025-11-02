// Importação temporária para desenvolvimento web
// Para desktop app, trocar por better-sqlite3
import { Part } from '@/components/PartsTable';

export interface DatabasePart extends Omit<Part, 'id'> {
  id?: number;
}

class PartsDatabase {
  private storageKey = 'prateleira_parts_data';
  private initialized = false;

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Criar tabela de peças se não existir
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        componentType TEXT NOT NULL CHECK (componentType IN ('PLASMA', 'TUBO', 'COMPONENTES', 'PONTEIRA', 'REFORÇO')),
        orderNumber TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('INCOMPLETO', 'COMPLETO')),
        createdAt TEXT NOT NULL
      )
    `);

    // Inserir dados iniciais se a tabela estiver vazia
    const count = this.db.prepare('SELECT COUNT(*) as count FROM parts').get() as { count: number };
    if (count.count === 0) {
      this.insertInitialData();
    }
  }

  private insertInitialData() {
    const initialParts: DatabasePart[] = [
      {
        code: "FT4000",
        componentType: "COMPONENTES",
        orderNumber: "12000",
        quantity: 45,
        location: "A-12",
        status: "COMPLETO",
        createdAt: new Date("2025-10-30T10:30:00").toISOString(),
      },
      {
        code: "FT4001",
        componentType: "PLASMA",
        orderNumber: "12001",
        quantity: 12,
        location: "B-03",
        status: "INCOMPLETO",
        createdAt: new Date("2025-10-31T08:15:00").toISOString(),
      },
      {
        code: "FT4002",
        componentType: "TUBO",
        orderNumber: "12002",
        quantity: 30,
        location: "C-15",
        status: "COMPLETO",
        createdAt: new Date("2025-10-31T14:20:00").toISOString(),
      }
    ];

    const insert = this.db.prepare(`
      INSERT INTO parts (code, componentType, orderNumber, quantity, location, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const part of initialParts) {
      insert.run(
        part.code,
        part.componentType,
        part.orderNumber,
        part.quantity,
        part.location,
        part.status,
        part.createdAt
      );
    }
  }

  // Métodos CRUD
  getAllParts(): Part[] {
    const parts = this.db.prepare('SELECT * FROM parts ORDER BY createdAt DESC').all() as DatabasePart[];
    return parts.map(part => ({
      ...part,
      id: part.id!.toString()
    }));
  }

  getPartById(id: string): Part | null {
    const part = this.db.prepare('SELECT * FROM parts WHERE id = ?').get(id) as DatabasePart;
    if (!part) return null;
    return {
      ...part,
      id: part.id!.toString()
    };
  }

  createPart(part: Omit<Part, 'id' | 'createdAt'>): Part {
    const createdAt = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO parts (code, componentType, orderNumber, quantity, location, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      part.code,
      part.componentType,
      part.orderNumber,
      part.quantity,
      part.location,
      part.status,
      createdAt
    );

    return {
      ...part,
      id: result.lastInsertRowid.toString(),
      createdAt
    };
  }

  updatePart(id: string, part: Omit<Part, 'id' | 'createdAt'>): Part | null {
    const existingPart = this.getPartById(id);
    if (!existingPart) return null;

    const update = this.db.prepare(`
      UPDATE parts 
      SET code = ?, componentType = ?, orderNumber = ?, quantity = ?, location = ?, status = ?
      WHERE id = ?
    `);

    update.run(
      part.code,
      part.componentType,
      part.orderNumber,
      part.quantity,
      part.location,
      part.status,
      id
    );

    return {
      ...part,
      id,
      createdAt: existingPart.createdAt
    };
  }

  deletePart(id: string): boolean {
    const deleteStmt = this.db.prepare('DELETE FROM parts WHERE id = ?');
    const result = deleteStmt.run(id);
    return result.changes > 0;
  }

  searchParts(query: string): Part[] {
    const parts = this.db.prepare(`
      SELECT * FROM parts 
      WHERE code LIKE ? OR orderNumber LIKE ? OR location LIKE ?
      ORDER BY createdAt DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as DatabasePart[];

    return parts.map(part => ({
      ...part,
      id: part.id!.toString()
    }));
  }

  close() {
    this.db.close();
  }
}

// Instância singleton do banco
let partsDb: PartsDatabase | null = null;

export const getDatabase = () => {
  if (!partsDb) {
    partsDb = new PartsDatabase();
  }
  return partsDb;
};

export default PartsDatabase;