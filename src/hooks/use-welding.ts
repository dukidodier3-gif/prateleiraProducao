import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WeldingStore, WeldingItemRecord } from '@/lib/idb';

export interface WeldingItem {
  id: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
}

export const useWeldingItems = () => {
  return useQuery({
    queryKey: ['welding-items'],
    queryFn: async (): Promise<WeldingItem[]> => {
      const recs = await WeldingStore.list();
      return recs as WeldingItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useWeldingItemsByDate = (startDate: string, endDate: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['welding-items-by-date', startDate, endDate],
    queryFn: async (): Promise<WeldingItem[]> => {
      const recs = await WeldingStore.listByDate(startDate, endDate);
      return recs as WeldingItem[];
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddWeldingItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { code: string; orderNumber: string; orderQuantity: number; }): Promise<WeldingItem> => {
      const rec = await WeldingStore.add({ ...data });
      return rec as WeldingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welding-items'] });
      toast.success('Item enviado para solda com sucesso!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao enviar para solda.');
    }
  });
};

export const useDeleteWeldingItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await WeldingStore.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welding-items'] });
      toast.success('Item removido com sucesso!');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Erro ao remover item.');
    }
  });
};
