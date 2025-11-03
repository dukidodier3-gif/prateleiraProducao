import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePatchPart } from '@/hooks/use-parts';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partId: string;
  initialComment: string;
}

export default function CommentDialog({ open, onOpenChange, partId, initialComment }: Props) {
  const [comment, setComment] = useState(initialComment || '');
  const patch = usePatchPart();

  useEffect(() => {
    if (open) setComment(initialComment || '');
  }, [open, initialComment]);

  const handleSave = async () => {
    if (!partId) return onOpenChange(false);
    await patch.mutateAsync({ id: partId, patch: { comment } as any });
    onOpenChange(false);
  };

  const handleClear = async () => {
    if (!partId) return onOpenChange(false);
    await patch.mutateAsync({ id: partId, patch: { comment: '' } as any });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aviso / Comentário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-sm font-medium">Texto do aviso</label>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Escreva aqui o aviso para esta linha"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear} disabled={patch.isPending}>Limpar</Button>
          <Button onClick={handleSave} disabled={patch.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
