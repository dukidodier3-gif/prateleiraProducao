import { useMemo, useState } from "react";
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
import { useParts } from "@/hooks/use-parts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEngateInfo, useEnviarSoldaEngate } from "@/hooks/use-welding";

interface SendToWeldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendToWeldingDialog = ({ open, onOpenChange }: SendToWeldingDialogProps) => {
  const [code, setCode] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tag, setTag] = useState<string>("DEMANDA");

  const { data: parts = [] } = useParts();
  const opsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    parts.filter(p => p.code === code.trim()).forEach(p => set.add(p.orderNumber));
    return Array.from(set);
  }, [parts, code]);

  const { data: engateInfo } = useEngateInfo(code.trim() || undefined, orderNumber.trim() || undefined);
  const enviar = useEnviarSoldaEngate();

  const capacidade = engateInfo?.capacidade ?? 0;

  const handleSubmit = async () => {
    if (!code.trim()) return setError("Digite o código da peça");
    if (!orderNumber.trim()) return setError("Informe a OP");
    if (!password.trim()) return setError("Digite a senha");
    if (password !== 'brucke') return setError('Senha incorreta');

    // Envio sempre TOTAL: usa a capacidade detectada (todos os conjuntos possíveis)
    const qtd = capacidade;
    if (!qtd || qtd <= 0) return setError('Quantidade inválida');

    await enviar.mutateAsync({ code: code.trim(), orderNumber: orderNumber.trim(), conjuntos: qtd, tag });
    setCode("");
    setOrderNumber("");
    setPassword("");
    setTag("DEMANDA");
    setError("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setCode("");
    setOrderNumber("");
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
            Envie o engate (mesmo código + mesma OP), debitando todos os itens por fator. O envio é total, conforme capacidade detectada.
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
                if (e.key === "Enter" && password && orderNumber) handleSubmit();
              }}
            />
          </div>

          {code.trim() && (
            <div className="grid gap-2">
              <Label htmlFor="op">OP</Label>
              <Input
                id="op"
                placeholder={opsDisponiveis.length ? `Disponíveis: ${opsDisponiveis.join(', ')}` : 'Informe a OP'}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {capacidade > 0 ? `Capacidade: ${capacidade} conjunto(s)` : 'Sem capacidade ou componentes não encontrados'}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Origem/Tag</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEMANDA">Demanda</SelectItem>
                <SelectItem value="MERCADO_LIVRE">Mercado Livre</SelectItem>
                <SelectItem value="URGENCIA">Urgência</SelectItem>
              </SelectContent>
            </Select>
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
                if (e.key === "Enter" && code && orderNumber) handleSubmit();
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
          <Button onClick={handleSubmit} disabled={!code.trim() || !orderNumber.trim() || !password.trim() || capacidade <= 0 || enviar.isPending}>
            Enviar (Total)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
