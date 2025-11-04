import { useEffect, useState } from 'react';
import { checkPersistenceStatus } from '@/lib/persistence';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { runBackupOnce } from '@/lib/backup';

export function PersistenceMonitor() {
  const [status, setStatus] = useState<{ persisted: boolean; usage?: number; quota?: number } | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const result = await checkPersistenceStatus();
      const usage = result.estimate?.usage ?? 0;
      const quota = result.estimate?.quota ?? 0;
      
      setStatus({
        persisted: result.persisted,
        usage,
        quota
      });

      // Mostrar aviso somente se uso > 90% da quota (sem alertar sobre persistência)
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      if (usagePercent > 90) setShowWarning(true);
    };

    checkStatus();
    
    // Verificar a cada 2 minutos
    const interval = setInterval(checkStatus, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (!showWarning || !status) return null;

  const usagePercent = status.quota ? ((status.usage ?? 0) / status.quota) * 100 : 0;
  const usageMB = ((status.usage ?? 0) / (1024 * 1024)).toFixed(2);
  const quotaMB = ((status.quota ?? 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50">
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Armazenamento Monitorado</AlertTitle>
        <AlertDescription className="space-y-2">
          {status.quota > 0 && (
            <p className="text-xs">
              Uso: {usageMB} MB / {quotaMB} MB ({usagePercent.toFixed(1)}%)
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => runBackupOnce()} variant="outline">
              Backup Agora
            </Button>
            <Button size="sm" onClick={() => setShowWarning(false)} variant="ghost">
              Dispensar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
