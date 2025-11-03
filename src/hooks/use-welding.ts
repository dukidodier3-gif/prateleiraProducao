import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WeldingStore, WeldingItemRecord, getPartById, decrementItemQuantity, getEngateComponents, computeEngateCapacity, sendEngateToWelding, getComponentsByOrderNumber, computeCapacityByOP, sendPartialByOrderNumber } from '@/lib/idb';

export interface WeldingItem {
  id: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
  conjuntos?: number;
  tag?: string;
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

// Envio parcial: debita (fator * conjuntos) do itemQuantity da peça e registra em welding_items
export function useEnviarParcialSolda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { partId: number; conjuntos: number }) => {
      const { partId, conjuntos } = params;
      if (!Number.isFinite(conjuntos) || conjuntos <= 0) throw new Error('Conjuntos inválido');
      const part = await getPartById(partId);
      if (!part) throw new Error('Peça não encontrada');
      const fator = part.fator ?? 1;
      const debito = fator * conjuntos;
      const saldo = (part.itemQuantity ?? 0) - debito;
      if (saldo < 0) throw new Error(`Estoque insuficiente. Precisa ${debito}, disponível ${part.itemQuantity ?? 0}`);
      await decrementItemQuantity(partId, debito);
      await WeldingStore.add({
        code: part.code,
        orderNumber: part.orderNumber,
        orderQuantity: debito,
        conjuntos,
        fatorUsado: fator,
        debito
      });
      return { debito, fator };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['welding-items'] });
      toast.success('Envio parcial registrado');
    },
    onError: (e) => {
      console.error(e);
      toast.error((e as Error).message || 'Falha no envio parcial');
    }
  });
}

// Info do engate (componentes e capacidade)
export function useEngateInfo(code?: string, orderNumber?: string) {
  return useQuery({
    queryKey: ['engate-info', code, orderNumber],
    enabled: !!code && !!orderNumber,
    queryFn: async () => {
      const comps = await getEngateComponents(code!, orderNumber!);
      const capacidade = computeEngateCapacity(comps);
      return { components: comps, capacidade };
    },
    staleTime: 30 * 1000,
  });
}

// Envio parcial/total por engate
export function useEnviarSoldaEngate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { code: string; orderNumber: string; conjuntos: number; tag?: string }) => {
      return sendEngateToWelding(p);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      qc.invalidateQueries({ queryKey: ['welding-items'] });
      qc.invalidateQueries({ queryKey: ['engate-info'] });
      toast.success('Envio para solda realizado');
    },
    onError: (e) => {
      console.error(e);
      toast.error((e as Error).message || 'Falha ao enviar engate');
    }
  });
}

// Capacidade agregada por OP (mínimo de floor(itemQuantity/fator))
export function useCapacidadePorOP(orderNumber?: string) {
  return useQuery({
    queryKey: ['op-capacidade', orderNumber],
    enabled: !!orderNumber,
    queryFn: async () => {
      const comps = await getComponentsByOrderNumber(orderNumber!);
      const capacidade = computeCapacityByOP(comps);
      return { components: comps, capacidade };
    },
    staleTime: 30 * 1000,
  });
}

// Envio parcial por OP: debita todos os itens com mesma OP por fator
export function useEnviarParcialPorOP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { orderNumber: string; conjuntos: number; tag?: string }) => {
      return sendPartialByOrderNumber(p);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      qc.invalidateQueries({ queryKey: ['welding-items'] });
      qc.invalidateQueries({ queryKey: ['op-capacidade'] });
      toast.success('Envio parcial por OP realizado');
    },
    onError: (e) => {
      console.error(e);
      toast.error((e as Error).message || 'Falha ao enviar parcial por OP');
    }
  });
}
