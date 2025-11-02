import { useCallback, useState } from "react";

export interface OrdemItem {
  id?: number;
  codigo: string;
  tipo: string;
  localizacao: string;
  quantidadePorEngate: number;
  displayQuantidade: number;
}

export interface OrdemProducao {
  id?: number;
  codigo: string;
  descricao?: string;
  quantidadeProduzida: number;
  quantidadeTotal: number;
  status?: string;
  itens: OrdemItem[];
}

export const useOrdemProducao = () => {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    try {
      // Tenta buscar do backend, se existir
      const res = await fetch('/api/producao');
      if (res.ok) {
        const json = await res.json();
        // esperar estrutura { success, data }
        const data = json?.data ?? json;
        setOrdens(Array.isArray(data) ? data : []);
      } else {
        // fallback: manter ordens vazias
        setOrdens([]);
      }
    } catch (e) {
      // backend possivelmente não implementado — usar fallback vazio
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const criarOP = useCallback(async (op: Partial<OrdemProducao>) => {
    // Simula criação localmente
    const novo: OrdemProducao = {
      id: Date.now(),
      codigo: op.codigo ?? `OP-${Date.now()}`,
      descricao: op.descricao ?? "",
      quantidadeProduzida: op.quantidadeProduzida ?? 0,
      quantidadeTotal: op.quantidadeTotal ?? 0,
      status: op.status ?? "PENDENTE",
      itens: op.itens ?? [],
    };
    setOrdens(prev => [novo, ...prev]);
    return novo;
  }, []);

  const adicionarQuantidade = useCallback(async (itemId: number, quantidade: number) => {
    // Atualiza estado local; se backend existir, ele pode receber a requisição
    setOrdens(prev => prev.map(op => ({
      ...op,
      itens: op.itens.map(it => {
        if (it.id === itemId) {
          const novoDisplay = (it.displayQuantidade ?? 0) + quantidade;
          return { ...it, displayQuantidade: novoDisplay };
        }
        return it;
      })
    })));
    // Tenta enviar para o backend (não obrigatório)
    try {
      await fetch(`/api/producao/items/${itemId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade })
      });
    } catch (e) {
      // ignorar erro — já atualizamos localmente
    }
  }, []);

  const enviarParaSolda = useCallback(async (opId: number, quantidade: number) => {
    // Simular comportamento: reduzir quantidade disponível e marcar enviado
    setOrdens(prev => prev.map(op => {
      if (op.id === opId) {
        const novaQuantidadeProduzida = (op.quantidadeProduzida ?? 0) + quantidade;
        return { ...op, quantidadeProduzida: novaQuantidadeProduzida };
      }
      return op;
    }));

    try {
      await fetch(`/api/producao/${opId}/send-to-welding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade })
      });
    } catch (e) {
      // ignorar falha backend
    }
  }, []);

  return {
    ordens,
    loading,
    criarOP,
    adicionarQuantidade,
    enviarParaSolda,
    carregarOrdens,
  };
};

export default useOrdemProducao;
