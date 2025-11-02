import { Part } from '@/components/PartsTable';

// Interface para compatibilidade com browser e desktop
export interface DatabasePart extends Omit<Part, 'id'> {
  id?: number;
}

class BrowserPartsDatabase {
  private storageKey = 'prateleira_parts_data';
  private initialized = false;

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    if (this.initialized) return;
    
    // Verificar se há dados no localStorage
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      this.insertInitialData();
    }
    this.initialized = true;
  }

  private insertInitialData() {
    const initialParts: Part[] = [
      {
        id: "1",
        code: "FT4000",
        componentType: "COMPONENTES",
        orderNumber: "12000",
        quantity: 45,
        location: "A-12",
        status: "COMPLETO",
        createdAt: new Date("2025-10-30T10:30:00").toISOString(),
      },
      {
        id: "2",
        code: "FT4001",
        componentType: "PLASMA",
        orderNumber: "12001",
        quantity: 12,
        location: "B-03",
        status: "INCOMPLETO",
        createdAt: new Date("2025-10-31T08:15:00").toISOString(),
      },
      {
        id: "3",
        code: "FT4002",
        componentType: "TUBO",
        orderNumber: "12002",
        quantity: 30,
        location: "C-15",
        status: "COMPLETO",
        createdAt: new Date("2025-10-31T14:20:00").toISOString(),
      }
    ];

    localStorage.setItem(this.storageKey, JSON.stringify(initialParts));
  }

  private getAllData(): Part[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveData(parts: Part[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(parts));
  }

  private getNextId(): string {
    const parts = this.getAllData();
    const maxId = parts.reduce((max, part) => {
      const numId = parseInt(part.id);
      return numId > max ? numId : max;
    }, 0);
    return (maxId + 1).toString();
  }

  // Métodos CRUD
  getAllParts(): Part[] {
    return this.getAllData().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getPartById(id: string): Part | null {
    const parts = this.getAllData();
    return parts.find(part => part.id === id) || null;
  }

  createPart(part: Omit<Part, 'id' | 'createdAt'>): Part {
    const parts = this.getAllData();
    const newPart: Part = {
      ...part,
      id: this.getNextId(),
      createdAt: new Date().toISOString(),
    };
    
    parts.push(newPart);
    this.saveData(parts);
    return newPart;
  }

  updatePart(id: string, partData: Omit<Part, 'id' | 'createdAt'>): Part | null {
    const parts = this.getAllData();
    const index = parts.findIndex(part => part.id === id);
    
    if (index === -1) return null;
    
    const existingPart = parts[index];
    const updatedPart: Part = {
      ...partData,
      id,
      createdAt: existingPart.createdAt,
    };
    
    parts[index] = updatedPart;
    this.saveData(parts);
    return updatedPart;
  }

  deletePart(id: string): boolean {
    const parts = this.getAllData();
    const filteredParts = parts.filter(part => part.id !== id);
    
    if (filteredParts.length === parts.length) return false;
    
    this.saveData(filteredParts);
    return true;
  }

  searchParts(query: string): Part[] {
    if (!query.trim()) return this.getAllParts();
    
    const parts = this.getAllData();
    const lowerQuery = query.toLowerCase();
    
    return parts.filter(part =>
      part.code.toLowerCase().includes(lowerQuery) ||
      part.orderNumber.toLowerCase().includes(lowerQuery) ||
      part.location.toLowerCase().includes(lowerQuery) ||
      part.componentType.toLowerCase().includes(lowerQuery) ||
      part.status.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  close() {
    // Não necessário para localStorage
  }
}

// Instância singleton do banco
let partsDb: BrowserPartsDatabase | null = null;

export const getDatabase = () => {
  if (!partsDb) {
    partsDb = new BrowserPartsDatabase();
  }
  return partsDb;
};

export default BrowserPartsDatabase;