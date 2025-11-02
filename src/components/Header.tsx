import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  const location = useLocation();
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
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
