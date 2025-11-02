import { snapshotAll } from './idb';
import { openDB } from './idb';
import { toast } from 'sonner';

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function alreadyRanToday(): boolean {
  const key = 'prateleira_backup_last_run';
  const val = localStorage.getItem(key);
  if (!val) return false;
  const today = formatDateYYYYMMDD(new Date());
  return val === today;
}

function markRanToday() {
  const key = 'prateleira_backup_last_run';
  const today = formatDateYYYYMMDD(new Date());
  localStorage.setItem(key, today);
}

export async function runBackupOnce() {
  try {
    const snap = await snapshotAll();
    const filename = `backup_prateleira_${formatDateYYYYMMDD(new Date())}.json`;
    downloadJson(filename, snap);
    markRanToday();
    toast.success('Backup diário gerado em JSON.');
  } catch (e) {
    console.error('Falha ao gerar backup:', e);
    toast.error('Falha ao gerar backup.');
  }
}

export function scheduleDailyBackupAt12h30() {
  // Evitar múltiplos agendamentos em várias abas: usar um lock simples de localStorage
  const lockKey = 'prateleira_backup_lock';
  if (localStorage.getItem(lockKey)) {
    // Ainda assim pode haver múltiplas abas; aceitável com verificação alreadyRanToday
  } else {
    try { localStorage.setItem(lockKey, '1'); } catch {}
  }

  const now = new Date();
  const target = new Date();
  target.setHours(12, 30, 0, 0); // 12:30 local
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();

  setTimeout(async () => {
    if (!alreadyRanToday()) {
      await runBackupOnce();
    }
    // Repetir a cada 24h
    setInterval(async () => {
      if (!alreadyRanToday()) {
        await runBackupOnce();
      }
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

// Restauração de backup
export type BackupSnapshot = {
  version?: number;
  timestamp?: string;
  parts?: any[];
  welding?: any[];
  ordens?: any[];
  itens?: any[];
};

async function clearStore(db: IDBDatabase, name: string) {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function bulkPut(db: IDBDatabase, name: string, items: any[]) {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function restoreBackupFromObject(data: BackupSnapshot) {
  const db = await openDB();
  // Limpar e restaurar stores que existirem no JSON
  if (Array.isArray(data.parts)) {
    await clearStore(db, 'parts');
    await bulkPut(db, 'parts', data.parts);
  }
  if (Array.isArray(data.welding)) {
    await clearStore(db, 'welding_items');
    await bulkPut(db, 'welding_items', data.welding);
  }
  if (Array.isArray(data.ordens)) {
    await clearStore(db, 'ordens');
    await bulkPut(db, 'ordens', data.ordens);
  }
  if (Array.isArray(data.itens)) {
    await clearStore(db, 'itens_ordem');
    await bulkPut(db, 'itens_ordem', data.itens);
  }
}

export async function restoreBackupFromFile(file: File) {
  const text = await file.text();
  const json = JSON.parse(text) as BackupSnapshot;
  await restoreBackupFromObject(json);
}
