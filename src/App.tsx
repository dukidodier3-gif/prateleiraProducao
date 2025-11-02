import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Welding from "./pages/Welding";
import NotFound from "./pages/NotFound";
import { PersistenceMonitor } from "@/components/PersistenceMonitor";
import { useEffect } from "react";
import { requestPersistentStorageWithRetry, checkPersistenceStatus } from "@/lib/persistence";
import { scheduleDailyBackupAt12h30 } from "@/lib/backup";
import { toast } from "sonner";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Solicitar persistência do armazenamento silenciosamente
    (async () => {
      const success = await requestPersistentStorageWithRetry(1, (status) => {
        // Mostrar apenas se conseguiu persistência (sucesso real)
        if (status.persisted) {
          toast.success('✓ Armazenamento protegido contra limpeza automática', { duration: 3000 });
        }
        // Não mostrar avisos - IndexedDB é seguro por padrão
      });

      // Verificar periodicamente apenas se conseguiu persistência
      if (success) {
        setInterval(async () => {
          const status = await checkPersistenceStatus();
          if (!status.persisted) {
            toast.error('⚠ Proteção de armazenamento foi revogada!', {
              duration: 15000,
              description: 'Faça backup imediatamente.'
            });
          }
        }, 5 * 60 * 1000); // 5 minutos
      }
    })();

    // Agendar backup diário às 12:30
    scheduleDailyBackupAt12h30();

    // Backup ao fechar a aba/janela (proteção adicional)
    const handleBeforeUnload = () => {
      // Salvar último snapshot no localStorage como fallback
      const lastBackupKey = 'prateleira_last_backup_timestamp';
      const lastBackup = localStorage.getItem(lastBackupKey);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Fazer backup apenas se passou mais de 1 hora desde o último
      if (!lastBackup || (now - parseInt(lastBackup)) > oneHour) {
        localStorage.setItem(lastBackupKey, String(now));
        // Trigger download silencioso não funciona em beforeunload
        // Então apenas marcamos para o próximo load sugerir backup
        localStorage.setItem('prateleira_suggest_backup', '1');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Sugerir backup se marcado
    if (localStorage.getItem('prateleira_suggest_backup') === '1') {
      localStorage.removeItem('prateleira_suggest_backup');
      setTimeout(() => {
        toast.message('Lembrete: Faça backup dos seus dados regularmente', {
          duration: 5000,
          description: 'Use o botão "Backup Agora" no menu.'
        });
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PersistenceMonitor />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/solda" element={<Welding />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
