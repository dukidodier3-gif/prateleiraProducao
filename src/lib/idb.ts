// IndexedDB wrapper simples para o app
// Stores: parts, welding_items, ordens, itens_ordem

const DB_NAME = 'prateleira-db';
const DB_VERSION = 1; // Sem mudança estrutural de índices; adicionamos novos campos via migração lógica

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
  // novo: fator do componente para envio parcial (default 1)
  fator?: number;
  // comentário/aviso exibido no grid (linha fica destacada quando presente)
  comment?: string;
  // qualidade: APROVADO | REPROVADO | '-' (padrão)
  quality?: 'APROVADO' | 'REPROVADO' | '-';
};

export type WeldingItemRecord = {
  id?: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
  // campos opcionais para envio parcial
  conjuntos?: number;
  fatorUsado?: number;
  debito?: number;
  // tag/origem do envio (ex.: DEMANDA, MERCADO_LIVRE, URGENCIA)
  tag?: string;
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
    await ensureFatorDefault();
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
    const id = await add('parts', { fator: 1, comment: data.comment ?? '', quality: data.quality ?? '-', ...data, createdAt: now });
    return { id, fator: 1, comment: data.comment ?? '', quality: data.quality ?? '-', ...(data as any), createdAt: now };
  },
  async update(id: number, data: Omit<PartRecord, 'id' | 'createdAt'>): Promise<PartRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data } as PartRecord;
    await put('parts', updated);
    return updated;
  },
  async patch(id: number, patch: Partial<PartRecord>): Promise<PartRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch } as PartRecord;
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

// Engate = conjunto de componentes com mesmo code + orderNumber
export async function getEngateComponents(code: string, orderNumber: string): Promise<PartRecord[]> {
  const all = await PartsStore.list();
  return all.filter(p => p.code === code && p.orderNumber === orderNumber);
}

export function computeEngateCapacity(components: PartRecord[]): number {
  if (!components.length) return 0;
  return components.reduce((min, p) => {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const qty = Math.floor(Number(p.itemQuantity ?? 0) / fator);
    return Math.min(min, qty);
  }, Number.POSITIVE_INFINITY);
}

export async function sendEngateToWelding(params: { code: string; orderNumber: string; conjuntos: number; tag?: string }): Promise<{ totalDebito: number }> {
  const { code, orderNumber, conjuntos, tag } = params;
  const components = await getEngateComponents(code, orderNumber);
  if (!components.length) throw new Error('Nenhum componente encontrado para este engate');

  const capacidade = computeEngateCapacity(components);
  if (conjuntos <= 0) throw new Error('Conjuntos deve ser maior que 0');
  if (conjuntos > capacidade) throw new Error(`Conjuntos acima do possível. Máximo: ${capacidade}`);

  // Debitar de todos os componentes
  let totalDebito = 0;
  for (const p of components) {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const debito = fator * conjuntos;
    totalDebito += debito;
    const nextQty = (p.itemQuantity ?? 0) - debito;
    if (nextQty < 0) throw new Error(`Estoque insuficiente para ${p.code}. Precisa ${debito}, tem ${p.itemQuantity ?? 0}`);
  }

  // Persistir alterações
  for (const p of components) {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const debito = fator * conjuntos;
    await PartsStore.patch(p.id!, { itemQuantity: (p.itemQuantity ?? 0) - debito });
  }

  // Registrar um item agregado de envio
  await WeldingStore.add({
    code,
    orderNumber,
    orderQuantity: totalDebito,
    conjuntos,
    debito: totalDebito,
    tag,
  } as any);

  return { totalDebito };
}

// Listar componentes por número da OP (independente do código)
export async function getComponentsByOrderNumber(orderNumber: string): Promise<PartRecord[]> {
  const all = await PartsStore.list();
  return all.filter(p => p.orderNumber === orderNumber);
}

// Capacidade por OP: mínimo de floor(itemQuantity/fator) entre todos os itens da OP
export function computeCapacityByOP(components: PartRecord[]): number {
  if (!components.length) return 0;
  return components.reduce((min, p) => {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const qty = Math.floor(Number(p.itemQuantity ?? 0) / fator);
    return Math.min(min, qty);
  }, Number.POSITIVE_INFINITY);
}

// Envio parcial por OP: debita (fator * conjuntos) de TODOS os itens com a mesma OP
export async function sendPartialByOrderNumber(params: { orderNumber: string; conjuntos: number; tag?: string }): Promise<{ totalDebito: number; itensAfetados: number }> {
  const { orderNumber, conjuntos, tag } = params;
  if (!orderNumber) throw new Error('Informe o número da OP');
  if (!Number.isFinite(conjuntos) || conjuntos <= 0) throw new Error('Conjuntos deve ser maior que 0');
  const components = await getComponentsByOrderNumber(orderNumber);
  if (!components.length) throw new Error('Nenhum item encontrado para esta OP');

  // Validar saldo suficiente em todos
  for (const p of components) {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const debito = fator * conjuntos;
    const nextQty = (p.itemQuantity ?? 0) - debito;
    if (nextQty < 0) {
      const capacidade = computeCapacityByOP(components);
      throw new Error(`Estoque insuficiente em ${p.code}. Máximo possível para esta OP: ${capacidade} conjunto(s).`);
    }
  }

  // Aplicar débitos e acumular por código
  let totalDebito = 0;
  const byCode = new Map<string, number>();
  for (const p of components) {
    const fator = Math.max(1, Number(p.fator ?? 1));
    const debito = fator * conjuntos;
    totalDebito += debito;
    await PartsStore.patch(p.id!, { itemQuantity: (p.itemQuantity ?? 0) - debito });
    byCode.set(p.code, (byCode.get(p.code) || 0) + debito);
  }

  // Registrar um item por código para esta OP (mostra o código real na listagem)
  for (const [code, debitoCode] of byCode.entries()) {
    await WeldingStore.add({
      code,
      orderNumber,
      orderQuantity: debitoCode,
      conjuntos,
      debito: debitoCode,
      tag,
    } as any);
  }

  return { totalDebito, itensAfetados: components.length };
}

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
        fator: 1,
      };
      await add('parts', rec);
    }
    localStorage.setItem(MIG_FLAG, '1');
  } catch (e) {
    // ignorar falha de migração
  }
}

// Migração leve: garantir fator=1 para peças existentes
export async function ensureFatorDefault() {
  const db = await openDB();
  const tx = db.transaction('parts', 'readwrite');
  const store = tx.objectStore('parts');
  const all: PartRecord[] = await promisify(store.getAll() as IDBRequest<PartRecord[]>);
  for (const p of all) {
    if (p.fator === undefined || p.fator === null) {
      p.fator = 1;
      await promisify(store.put(p) as IDBRequest<IDBValidKey>);
    }
  }
  // transação será concluída automaticamente após as operações
}

// Utilidades específicas para parcial
export async function getPartById(id: number): Promise<PartRecord | undefined> {
  return getById('parts', id);
}

export async function decrementItemQuantity(partId: number, amount: number): Promise<PartRecord | null> {
  const existing = await getById<PartRecord>('parts', partId);
  if (!existing) return null;
  const nextQty = Math.max(0, (existing.itemQuantity ?? 0) - amount);
  const updated = { ...existing, itemQuantity: nextQty } as PartRecord;
  await put('parts', updated);
  return updated;
}
