import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PartsStore, PartRecord } from '@/lib/idb';
import type { Part as UIPart } from '@/components/PartsTable';

export const PARTS_QUERY_KEY = ['parts'];

// Mapear do registro (IDB) para o shape usado no UI
const toUI = (r: PartRecord): UIPart => ({
  id: String(r.id!),
  code: r.code,
  componentType: r.componentType,
  orderNumber: r.orderNumber,
  quantity: r.itemQuantity,
  itemQuantity: r.itemQuantity,
  orderQuantity: r.orderQuantity,
  location: r.location,
  status: r.status,
  createdAt: r.createdAt,
});

const fromUI = (p: Omit<UIPart, 'id' | 'createdAt'> & Partial<Pick<UIPart, 'createdAt'>>): Omit<PartRecord, 'id'> => ({
  code: p.code,
  componentType: p.componentType,
  orderNumber: p.orderNumber,
  orderQuantity: (p as any).orderQuantity ?? p.quantity,
  itemQuantity: (p as any).itemQuantity ?? p.quantity,
  location: p.location,
  status: p.status,
  createdAt: (p as any).createdAt ?? new Date().toISOString(),
});

export const useParts = () => {
  return useQuery({
    queryKey: PARTS_QUERY_KEY,
    queryFn: async (): Promise<UIPart[]> => {
      const list = await PartsStore.list();
      return list.map(toUI);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const usePart = (id: string) => {
  return useQuery({
    queryKey: [...PARTS_QUERY_KEY, id],
    queryFn: async (): Promise<UIPart | null> => {
      const rec = await PartsStore.get(Number(id));
      return rec ? toUI(rec) : null;
    },
    enabled: !!id,
  });
};

export const usePartsSearch = (query: string) => {
  return useQuery({
    queryKey: [...PARTS_QUERY_KEY, 'search', query],
    queryFn: async (): Promise<UIPart[]> => {
      const recs = query ? await PartsStore.search(query) : await PartsStore.list();
      return recs.map(toUI);
    },
    staleTime: 30 * 1000,
  });
};

export const useCreatePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (partData: Omit<UIPart, 'id' | 'createdAt'>): Promise<UIPart> => {
      const rec = await PartsStore.create(fromUI(partData));
      return toUI(rec);
    },
    onSuccess: (newPart) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      queryClient.setQueryData(PARTS_QUERY_KEY, (old: UIPart[] | undefined) => old ? [newPart, ...old] : [newPart]);
      toast.success('Peça criada com sucesso!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao criar peça.');
    }
  });
};

export const useUpdatePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partData }: { id: string; partData: Omit<UIPart, 'id' | 'createdAt'> }): Promise<UIPart> => {
      const rec = await PartsStore.update(Number(id), fromUI(partData));
      if (!rec) throw new Error('Peça não encontrada');
      return toUI(rec);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      queryClient.setQueryData([...PARTS_QUERY_KEY, updated.id], updated);
      queryClient.setQueryData(PARTS_QUERY_KEY, (old: UIPart[] | undefined) => old ? old.map(p => p.id === updated.id ? updated : p) : [updated]);
      toast.success('Peça atualizada com sucesso!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao atualizar peça.');
    }
  });
};

export const useDeletePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      await PartsStore.delete(Number(id));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      queryClient.removeQueries({ queryKey: [...PARTS_QUERY_KEY, deletedId] });
      queryClient.setQueryData(PARTS_QUERY_KEY, (old: UIPart[] | undefined) => old ? old.filter(p => p.id !== deletedId) : []);
      toast.success('Peça removida com sucesso!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao remover peça.');
    }
  });
};

export const useDeletePartsByCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<{ count: number }> => {
      const count = await PartsStore.deleteByCode(code);
      return { count };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success(`${result.count} peça(s) removida(s) com sucesso!`);
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao remover peças.');
    }
  });
};

export const useDeletePartsByType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: string): Promise<{ count: number }> => {
      const count = await PartsStore.deleteByType(type as any);
      return { count };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success(`${result.count} peça(s) removida(s) com sucesso!`);
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao remover peças.');
    }
  });
};