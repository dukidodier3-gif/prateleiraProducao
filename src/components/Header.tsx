import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { restoreBackupFromFile, runBackupOnce } from "@/lib/backup";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const Header = () => {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);
  const handleRestore = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          await restoreBackupFromFile(file);
          toast.success('Backup restaurado com sucesso.');
          // opcional: recarregar página para refletir mudanças
          window.location.reload();
        } catch (e) {
          console.error(e);
          toast.error('Falha ao restaurar backup.');
        }
      };
      input.click();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao iniciar restauração.');
    }
  };
  return (
    <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/Brucke.ico" alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sistema de Agrupamento</h1>
              <p className="text-sm text-muted-foreground">Gestão de Inventário</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant={location.pathname === '/' ? 'default' : 'outline'}>
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant={location.pathname === '/dashboard' ? 'default' : 'outline'}>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant={location.pathname === '/solda' ? 'default' : 'outline'}>
              <Link to="/solda">Solda</Link>
            </Button>
            <Button variant="outline" onClick={() => runBackupOnce()}>Backup Agora</Button>
            <Button variant="outline" onClick={handleRestore}>Restaurar Backup</Button>
            {deferredPrompt && (
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      toast.success('Instalação iniciada.');
                    }
                    setDeferredPrompt(null);
                  } catch (err) {
                    console.error(err);
                    toast.error('Falha ao iniciar instalação.');
                  }
                }}
              >
                Instalar App
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
