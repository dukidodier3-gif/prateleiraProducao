import { OrdensProducaoTable } from '../components/OrdensProducaoTable';
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Gestão de Ordens de Produção</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Inventário
          </Button>
        </div>

        <OrdensProducaoTable />
      </main>
    </div>
  );
};

export default Dashboard;
