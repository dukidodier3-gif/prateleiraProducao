// IndexedDB wrapper simples para o app
// Stores: parts, welding_items, ordens, itens_ordem

const DB_NAME = 'prateleira-db';
const DB_VERSION = 1;

export type PartRecord = {
  id?: number; // autoincrement
  code: string;
  componentType: 'PLASMA' | 'TUBO' | 'COMPONENTES' | 'PONTEIRA' | 'REFORÇO';
  orderNumber: string;
  orderQuantity: number;
  itemQuantity: number;
  location: string;
  status: 'INCOMPLETO' | 'COMPLETO';
  createdAt: string;
};

export type WeldingItemRecord = {
  id?: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
};

export type OrdemRecord = {
  id?: number;
  codigo: string;
  descricao?: string;
  quantidadeTotal: number;
  quantidadeProduzida: number;
  status?: string;
};

export type OrdemItemRecord = {
  id?: number;
  ordemId: number;
  codigo: string;
  tipo: string;
  localizacao: string;
  quantidadePorEngate: number;
  quantidadeAdicionada: number;
  quantidadeDisponivel: number;
};

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // parts
      if (!db.objectStoreNames.contains('parts')) {
        const store = db.createObjectStore('parts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_code', 'code', { unique: false });
        store.createIndex('by_type', 'componentType', { unique: false });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }
      // welding_items
      if (!db.objectStoreNames.contains('welding_items')) {
        const store = db.createObjectStore('welding_items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_sentAt', 'sentAt', { unique: false });
      }
      // ordens
      if (!db.objectStoreNames.contains('ordens')) {
        db.createObjectStore('ordens', { keyPath: 'id', autoIncrement: true });
      }
      // itens_ordem
      if (!db.objectStoreNames.contains('itens_ordem')) {
        const store = db.createObjectStore('itens_ordem', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_ordem', 'ordemId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getStore(db: IDBDatabase, name: string, mode: IDBTransactionMode = 'readonly') {
  return db.transaction(name, mode).objectStore(name);
}

// Helpers genéricos
export async function getAll<T = any>(storeName: string): Promise<T[]> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readonly');
  return promisify(store.getAll() as IDBRequest<T[]>);
}

export async function add<T = any>(storeName: string, value: T): Promise<number> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readwrite');
  const key = await promisify(store.add(value) as IDBRequest<IDBValidKey>);
  return Number(key);
}

export async function put<T = any>(storeName: string, value: T): Promise<number> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readwrite');
  const key = await promisify(store.put(value) as IDBRequest<IDBValidKey>);
  return Number(key);
}

export async function del(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readwrite');
  await promisify(store.delete(key));
}

export async function getById<T = any>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readonly');
  return promisify(store.get(key) as IDBRequest<T>);
}

export async function clearAll(storeName: string): Promise<void> {
  const db = await openDB();
  const store = getStore(db, storeName, 'readwrite');
  await promisify(store.clear());
}

// parts específicas
export const PartsStore = {
  async list(): Promise<PartRecord[]> {
    await maybeMigrateFromLocalStorage();
    const items = await getAll<PartRecord>('parts');
    // ordenar por createdAt desc
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async search(query: string): Promise<PartRecord[]> {
    const all = await this.list();
    const q = query.toLowerCase();
    return all.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.orderNumber.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.componentType.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  },
  async get(id: number): Promise<PartRecord | undefined> { return getById('parts', id); },
  async create(data: Omit<PartRecord, 'id' | 'createdAt'> & Partial<Pick<PartRecord, 'createdAt'>>): Promise<PartRecord> {
    const now = data.createdAt ?? new Date().toISOString();
    const id = await add('parts', { ...data, createdAt: now });
    return { id, ...(data as any), createdAt: now };
  },
  async update(id: number, data: Omit<PartRecord, 'id' | 'createdAt'>): Promise<PartRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data } as PartRecord;
    await put('parts', updated);
    return updated;
  },
  async delete(id: number): Promise<boolean> { await del('parts', id); return true; },
  async deleteByCode(code: string): Promise<number> {
    const all = await this.list();
    const toDelete = all.filter(p => p.code === code);
    for (const p of toDelete) await del('parts', p.id!);
    return toDelete.length;
  },
  async deleteByType(type: PartRecord['componentType']): Promise<number> {
    const all = await this.list();
    const toDelete = all.filter(p => p.componentType === type);
    for (const p of toDelete) await del('parts', p.id!);
    return toDelete.length;
  }
};

export const WeldingStore = {
  async list(): Promise<WeldingItemRecord[]> {
    const items = await getAll<WeldingItemRecord>('welding_items');
    return items.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },
  async listByDate(startDate: string, endDate: string): Promise<WeldingItemRecord[]> {
    const all = await this.list();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return all.filter(w => {
      const d = new Date(w.sentAt);
      const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return d0 >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
             d0 <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  },
  async add(item: Omit<WeldingItemRecord, 'id' | 'sentAt'> & Partial<Pick<WeldingItemRecord, 'sentAt'>>): Promise<WeldingItemRecord> {
    const sentAt = item.sentAt ?? new Date().toISOString();
    const id = await add('welding_items', { ...item, sentAt });
    return { id, ...(item as any), sentAt };
  },
  async delete(id: number): Promise<void> { await del('welding_items', id); }
};

export const ProducaoStore = {
  async listOrdens(): Promise<OrdemRecord[]> { return getAll('ordens'); },
  async listItens(ordemId: number): Promise<OrdemItemRecord[]> {
    const all = await getAll<OrdemItemRecord>('itens_ordem');
    return all.filter(i => i.ordemId === ordemId);
  },
  async addQuantidade(itemId: number, quantidade: number): Promise<void> {
    const it = await getById<OrdemItemRecord>('itens_ordem', itemId);
    if (!it) return;
    it.quantidadeAdicionada = (it.quantidadeAdicionada ?? 0) + quantidade;
    await put('itens_ordem', it);
  },
  async enviarParaSolda(opId: number, quantidade: number): Promise<void> {
    const op = await getById<OrdemRecord>('ordens', opId);
    if (!op) return;
    op.quantidadeProduzida = (op.quantidadeProduzida ?? 0) + quantidade;
    await put('ordens', op);
    // também registra nos itens de solda para rastreio
    await WeldingStore.add({ code: op.codigo, orderNumber: String(opId), orderQuantity: quantidade });
  }
};

// Utilitário para snapshot completo (para backup)
export async function snapshotAll() {
  const [parts, welding, ordens, itens] = await Promise.all([
    getAll('parts'),
    getAll('welding_items'),
    getAll('ordens'),
    getAll('itens_ordem')
  ]);
  return { parts, welding, ordens, itens, timestamp: new Date().toISOString(), version: DB_VERSION };
}

// Migração simples do localStorage (compat anterior do navegador)
const LS_KEY = 'prateleira_parts_data';
const MIG_FLAG = 'prateleira_migrated_to_idb';
async function maybeMigrateFromLocalStorage() {
  try {
    if (localStorage.getItem(MIG_FLAG)) return;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { localStorage.setItem(MIG_FLAG, '1'); return; }
    const arr = JSON.parse(raw) as Array<any>;
    if (!Array.isArray(arr) || arr.length === 0) { localStorage.setItem(MIG_FLAG, '1'); return; }
    for (const p of arr) {
      const rec: PartRecord = {
        code: p.code,
        componentType: p.componentType,
        orderNumber: p.orderNumber,
        orderQuantity: p.orderQuantity ?? p.quantity ?? 0,
        itemQuantity: p.itemQuantity ?? p.quantity ?? 0,
        location: p.location,
        status: p.status,
        createdAt: p.createdAt ?? new Date().toISOString(),
      };
      await add('parts', rec);
    }
    localStorage.setItem(MIG_FLAG, '1');
  } catch (e) {
    // ignorar falha de migração
  }
}
