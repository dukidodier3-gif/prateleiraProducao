import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCapacidadePorOP, useEnviarParcialPorOP } from '@/hooks/use-welding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParts } from '@/hooks/use-parts';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function WeldingPartialByOPDialog({ open, onOpenChange }: Props) {
  const { data: parts = [] } = useParts();
  const [orderNumber, setOrderNumber] = useState('');
  const [conjuntos, setConjuntos] = useState<number>(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tag, setTag] = useState<string>('DEMANDA');

  // OPs existentes para sugestão
  const opOptions = useMemo(() => {
    const set = new Set<string>();
    (parts || []).forEach(p => set.add(p.orderNumber));
    return Array.from(set);
  }, [parts]);

  const { data: info } = useCapacidadePorOP(orderNumber.trim() || undefined);
  const capacidade = info?.capacidade ?? 0;
  const itensAfetados = info?.components?.length ?? 0;

  const enviar = useEnviarParcialPorOP();

  const handleSubmit = async () => {
    setError('');
    if (!orderNumber.trim()) return setError('Informe a OP');
    if (password !== 'brucke') return setError('Senha incorreta');
    if (!Number.isFinite(conjuntos) || conjuntos <= 0) return setError('Conjuntos inválido');
    if (capacidade > 0 && conjuntos > capacidade) {
      return setError(`Conjuntos acima do possível. Máximo: ${capacidade}`);
    }
    try {
      await enviar.mutateAsync({ orderNumber: orderNumber.trim(), conjuntos, tag });
      setOrderNumber('');
      setConjuntos(1);
      setPassword('');
      setTag('DEMANDA');
      onOpenChange(false);
      toast.success('Parcial por OP enviado');
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Parcial por OP</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Debita em todos os itens cadastrados com a mesma OP, multiplicando pela coluna Fator de cada item.
          </div>

          <label className="text-sm font-medium">Número da OP</label>
          <Input
            placeholder="Digite o número da OP"
            list="op-list"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && orderNumber && password) handleSubmit(); }}
          />
          <datalist id="op-list">
            {opOptions.map(op => (
              <option key={op} value={op} />
            ))}
          </datalist>

          <label className="text-sm font-medium">QNTS ENGATES</label>
          <Input
            type="number"
            min={1}
            value={conjuntos}
            onChange={(e) => setConjuntos(parseInt(e.target.value || '0', 10))}
          />

          <div className="grid gap-2">
            <label className="text-sm font-medium">Origem/Tag</label>
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

          <div className="text-sm">
            Itens afetados nesta OP: <b>{itensAfetados}</b>{' '}
            {capacidade > 0 && (
              <>
                | Capacidade máxima: <b>{capacidade}</b> conjunto(s)
              </>
            )}
          </div>

          <label className="text-sm font-medium">Senha</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && orderNumber) handleSubmit(); }}
          />

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!orderNumber || !password || enviar.isPending}>Enviar Parcial</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
