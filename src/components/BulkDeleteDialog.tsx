import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useDeletePartsByCode } from "@/hooks/use-parts";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BulkDeleteDialog = ({ open, onOpenChange }: BulkDeleteDialogProps) => {
  const [codeValue, setCodeValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const deleteByCodeMutation = useDeletePartsByCode();

  const handleConfirm = () => {
    if (password !== "brucke") {
      setError("Senha incorreta");
      return;
    }

    if (!codeValue.trim()) {
      setError("Digite um código válido");
      return;
    }
    
    deleteByCodeMutation.mutate(codeValue.trim(), {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const handleClose = () => {
    setCodeValue("");
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remoção em Lote por Código</DialogTitle>
          <DialogDescription>
            Remove todas as peças com o mesmo código. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Atenção! Esta ação irá remover permanentemente todas as peças com o código especificado.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code-input">Código da Peça</Label>
            <Input
              id="code-input"
              placeholder="Ex: FT4000"
              value={codeValue}
              onChange={(e) => {
                setCodeValue(e.target.value.toUpperCase());
                setError("");
              }}
            />
            <p className="text-xs text-muted-foreground">
              Todas as peças com este código serão removidas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha de Confirmação</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={deleteByCodeMutation.isPending}
          >
            {deleteByCodeMutation.isPending ? 'Removendo...' : 'Confirmar Remoção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteDialog;