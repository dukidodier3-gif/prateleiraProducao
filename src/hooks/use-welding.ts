import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Use Vite env var VITE_API_BASE_URL when deployed (ex: https://api.myapp.com)
const API_BASE_URL = ((): string => {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base) return `${base.replace(/\/$/, '')}/welding`;
  return 'http://localhost:3001/api/welding';
})();

export interface WeldingItem {
  id: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
}

// Hook para buscar todos os itens de solda
export const useWeldingItems = () => {
  return useQuery({
    queryKey: ['welding-items'],
    queryFn: async (): Promise<WeldingItem[]> => {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error('Erro ao buscar itens de solda');
      }
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para buscar itens por período
export const useWeldingItemsByDate = (startDate: string, endDate: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['welding-items-by-date', startDate, endDate],
    queryFn: async (): Promise<WeldingItem[]> => {
      const response = await fetch(
        `${API_BASE_URL}/by-date?startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error('Erro ao buscar itens por data');
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para adicionar item para solda
export const useAddWeldingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      orderNumber: string;
      orderQuantity: number;
    }): Promise<WeldingItem> => {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao enviar para solda');
      }
      
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welding-items'] });
      toast.success('Item enviado para solda com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao enviar para solda:', error);
      toast.error('Erro ao enviar para solda. Tente novamente.');
    },
  });
};

// Hook para deletar item de solda
export const useDeleteWeldingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar item');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welding-items'] });
      toast.success('Item removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item. Tente novamente.');
    },
  });
};
