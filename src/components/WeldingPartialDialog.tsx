import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPartById } from '@/lib/idb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEnviarParcialSolda } from '@/hooks/use-welding';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partId: string | number;
};

export function WeldingPartialDialog({ open, onOpenChange, partId }: Props) {
  const numericId = typeof partId === 'string' ? parseInt(partId, 10) : partId;
  const { data: part } = useQuery({
    queryKey: ['part', numericId],
    queryFn: () => getPartById(numericId),
    enabled: open && Number.isFinite(numericId as number),
  });

  const [conjuntos, setConjuntos] = useState<number>(1);
  const fator = part?.fator ?? 1;
  const debito = useMemo(() => (Number.isFinite(conjuntos) ? Math.max(0, conjuntos) * fator : 0), [conjuntos, fator]);
  const saldoApos = (part?.itemQuantity ?? 0) - debito;

  const enviarParcial = useEnviarParcialSolda();

  const handleConfirm = async () => {
    await enviarParcial.mutateAsync({ partId: numericId as number, conjuntos });
    onOpenChange(false);
    setConjuntos(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Parcial para Solda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <div>Peça: <b>{part?.code}</b></div>
            <div>OP: <b>{part?.orderNumber}</b></div>
            <div>Estoque atual: <b>{part?.itemQuantity ?? 0}</b></div>
            <div>Fator do componente: <b>{fator}</b></div>
          </div>
          <label className="text-sm font-medium">Quantidade de conjuntos a enviar</label>
          <Input
            type="number"
            min={1}
            value={conjuntos}
            onChange={(e) => setConjuntos(parseInt(e.target.value || '0', 10))}
          />
          <div className="text-sm">
            Débito calculado: <b>{debito}</b> ({conjuntos} × fator {fator})
          </div>
          <div className={`text-sm ${saldoApos < 0 ? 'text-red-600' : ''}`}>
            Saldo após envio: <b>{saldoApos}</b>
          </div>
          {enviarParcial.isError && (
            <div className="text-red-600 text-sm">
              {(enviarParcial.error as Error).message}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={debito <= 0 || saldoApos < 0 || enviarParcial.isPending}>
            Confirmar envio parcial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
