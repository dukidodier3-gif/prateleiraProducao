import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SendToWeldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (code: string, password: string) => void;
}

export const SendToWeldingDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: SendToWeldingDialogProps) => {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) {
      setError("Digite o código da peça");
      return;
    }
    if (!password.trim()) {
      setError("Digite a senha");
      return;
    }
    
    onConfirm(code.trim(), password);
    setCode("");
    setPassword("");
    setError("");
  };

  const handleClose = () => {
    setCode("");
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar para Solda</DialogTitle>
          <DialogDescription>
            Digite o código da peça que será enviada para solda. Todas as peças
            com este código serão removidas do inventário e registradas na aba de Solda.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Código da Peça</Label>
            <Input
              id="code"
              placeholder="Ex: FT4000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) handleSubmit();
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code) handleSubmit();
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Enviar para Solda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
