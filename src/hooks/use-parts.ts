import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Part } from '@/components/PartsTable';

// URL base da API: preferir variável de ambiente VITE_API_BASE_URL em deploy (ex: https://api.meusistema.com)
const API_BASE_URL = ((): string => {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base) return base.replace(/\/$/, '');
  return 'http://localhost:3001/api';
})();

// Keys para o cache do TanStack Query
export const PARTS_QUERY_KEY = ['parts'];

// Funções de API
type BackendPart = {
  id: string;
  code: string;
  componentType: Part['componentType'];
  orderNumber: string;
  orderQuantity: number;
  itemQuantity: number;
  location: string;
  status: Part['status'];
  createdAt: string;
};

const mapFromBackend = (bp: BackendPart): Part => ({
  id: bp.id,
  code: bp.code,
  componentType: bp.componentType,
  orderNumber: bp.orderNumber,
  quantity: bp.itemQuantity, // alias para compatibilidade
  itemQuantity: bp.itemQuantity,
  orderQuantity: bp.orderQuantity,
  location: bp.location,
  status: bp.status,
  createdAt: bp.createdAt,
});

const fetchParts = async (query?: string): Promise<Part[]> => {
  const url = query 
    ? `${API_BASE_URL}/parts?search=${encodeURIComponent(query)}`
    : `${API_BASE_URL}/parts`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erro ao buscar peças');
  }
  
  const data = await response.json();
  const items: BackendPart[] = data.data || [];
  return items.map(mapFromBackend);
};

const fetchPartById = async (id: string): Promise<Part | null> => {
  const response = await fetch(`${API_BASE_URL}/parts/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Erro ao buscar peça');
  }
  
  const data = await response.json();
  const item: BackendPart | null = data.data || null;
  return item ? mapFromBackend(item) : null;
};

const createPartAPI = async (partData: Omit<Part, 'id' | 'createdAt'>): Promise<Part> => {
  // Backend espera orderQuantity e itemQuantity: usar valores específicos quando presentes
  const payload = {
    code: partData.code,
    componentType: partData.componentType,
    orderNumber: partData.orderNumber,
    orderQuantity: (partData as any).orderQuantity ?? partData.quantity,
    itemQuantity: (partData as any).itemQuantity ?? partData.quantity,
    location: partData.location,
    status: partData.status,
  };

  const response = await fetch(`${API_BASE_URL}/parts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao criar peça');
  }
  
  const data = await response.json();
  return mapFromBackend(data.data as BackendPart);
};

const updatePartAPI = async (id: string, partData: Omit<Part, 'id' | 'createdAt'>): Promise<Part> => {
  const payload = {
    code: partData.code,
    componentType: partData.componentType,
    orderNumber: partData.orderNumber,
    orderQuantity: (partData as any).orderQuantity ?? partData.quantity,
    itemQuantity: (partData as any).itemQuantity ?? partData.quantity,
    location: partData.location,
    status: partData.status,
  };

  const response = await fetch(`${API_BASE_URL}/parts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao atualizar peça');
  }
  
  const data = await response.json();
  return mapFromBackend(data.data as BackendPart);
};

const deletePartAPI = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/parts/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao deletar peça');
  }
};

// Hook para buscar todas as peças
export const useParts = () => {
  return useQuery({
    queryKey: PARTS_QUERY_KEY,
    queryFn: () => fetchParts(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (era cacheTime)
  });
};

// Hook para buscar uma peça específica
export const usePart = (id: string) => {
  return useQuery({
    queryKey: [...PARTS_QUERY_KEY, id],
    queryFn: () => fetchPartById(id),
    enabled: !!id,
  });
};

// Hook para buscar peças com filtro
export const usePartsSearch = (query: string) => {
  return useQuery({
    queryKey: [...PARTS_QUERY_KEY, 'search', query],
    queryFn: () => fetchParts(query),
    staleTime: 30 * 1000, // 30 segundos para busca
  });
};

// Hook para criar nova peça
export const useCreatePart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partData: Omit<Part, 'id' | 'createdAt'>): Promise<Part> => {
      return createPartAPI(partData);
    },
    onSuccess: (newPart) => {
      // Invalidar e refetch as queries de peças
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      
      // Atualizar o cache otimisticamente
      queryClient.setQueryData(PARTS_QUERY_KEY, (oldParts: Part[] | undefined) => {
        if (!oldParts) return [newPart];
        return [newPart, ...oldParts];
      });

      toast.success('Peça criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar peça:', error);
      toast.error('Erro ao criar peça. Tente novamente.');
    },
  });
};

// Hook para atualizar peça
export const useUpdatePart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, partData }: { 
      id: string; 
      partData: Omit<Part, 'id' | 'createdAt'> 
    }): Promise<Part> => {
      return updatePartAPI(id, partData);
    },
    onSuccess: (updatedPart: Part) => {
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      
      // Atualizar cache específico da peça
      queryClient.setQueryData([...PARTS_QUERY_KEY, updatedPart.id], updatedPart);
      
      // Atualizar lista de peças no cache
      queryClient.setQueryData(PARTS_QUERY_KEY, (oldParts: Part[] | undefined) => {
        if (!oldParts) return [updatedPart];
        return oldParts.map(part => 
          part.id === updatedPart.id ? updatedPart : part
        );
      });

      toast.success('Peça atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar peça:', error);
      toast.error('Erro ao atualizar peça. Tente novamente.');
    },
  });
};

// Hook para deletar peça
export const useDeletePart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      await deletePartAPI(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      
      // Remover do cache
      queryClient.removeQueries({ queryKey: [...PARTS_QUERY_KEY, deletedId] });
      
      // Atualizar lista de peças no cache
      queryClient.setQueryData(PARTS_QUERY_KEY, (oldParts: Part[] | undefined) => {
        if (!oldParts) return [];
        return oldParts.filter(part => part.id !== deletedId);
      });

      toast.success('Peça removida com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover peça:', error);
      toast.error('Erro ao remover peça. Tente novamente.');
    },
  });
};

// Hook para deletar peças por código
export const useDeletePartsByCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<{count: number}> => {
      const response = await fetch(`${API_BASE_URL}/parts/bulk/by-code/${code}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar peças');
      }
      
      const data = await response.json();
      return { count: parseInt(data.message.match(/\d+/)[0]) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success(`${result.count} peça(s) removida(s) com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao remover peças:', error);
      toast.error('Erro ao remover peças. Tente novamente.');
    },
  });
};

// Hook para deletar peças por tipo
export const useDeletePartsByType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: string): Promise<{count: number}> => {
      const response = await fetch(`${API_BASE_URL}/parts/bulk/by-type/${type}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar peças');
      }
      
      const data = await response.json();
      return { count: parseInt(data.message.match(/\d+/)[0]) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success(`${result.count} peça(s) removida(s) com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao remover peças:', error);
      toast.error('Erro ao remover peças. Tente novamente.');
    },
  });
};