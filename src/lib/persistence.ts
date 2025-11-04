// Solicita armazenamento persistente para reduzir risco de limpeza pelo navegador
// https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist

export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).storage) return false;
  try {
    const storage: StorageManager = (navigator as any).storage;
    if (await storage.persisted()) return true;
    const granted = await storage.persist();
    return granted;
  } catch {
    return false;
  }
}

// Verifica periodicamente o status de persistência e notifica o usuário
export async function checkPersistenceStatus(): Promise<{ persisted: boolean; estimate?: StorageEstimate }> {
  if (typeof navigator === 'undefined' || !(navigator as any).storage) {
    return { persisted: false };
  }
  
  const storage: StorageManager = (navigator as any).storage;
  const persisted = await storage.persisted();
  let estimate: StorageEstimate | undefined;
  
  try {
    estimate = await storage.estimate();
  } catch {
    // estimativa não disponível
  }
  
  return { persisted, estimate };
}

// Tenta garantir persistência com retry e feedback ao usuário
export async function requestPersistentStorageWithRetry(
  maxAttempts: number = 3,
  onStatusChange?: (status: { persisted: boolean; attempt: number; message: string }) => void
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).storage) {
    onStatusChange?.({ persisted: false, attempt: 0, message: 'Storage API não disponível neste navegador.' });
    return false;
  }

  const storage: StorageManager = (navigator as any).storage;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const alreadyPersisted = await storage.persisted();
      if (alreadyPersisted) {
        onStatusChange?.({ persisted: true, attempt, message: '✓ Armazenamento persistente já garantido.' });
        return true;
      }

      const granted = await storage.persist();
      if (granted) {
        onStatusChange?.({ persisted: true, attempt, message: '✓ Armazenamento persistente concedido pelo navegador.' });
        return true;
      } else {
        onStatusChange?.({ persisted: false, attempt, message: `Tentativa ${attempt}/${maxAttempts}: Navegador negou a persistência.` });
      }
    } catch (err) {
      onStatusChange?.({ persisted: false, attempt, message: `Tentativa ${attempt}/${maxAttempts}: Erro ao solicitar persistência.` });
    }

    if (attempt < maxAttempts) {
      // aguardar 1 segundo antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  onStatusChange?.({ persisted: false, attempt: maxAttempts, message: '⚠ Não foi possível garantir persistência após múltiplas tentativas. O navegador pode limpar dados em situações de baixo espaço.' });
  return false;
}
