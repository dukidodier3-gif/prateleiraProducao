import { useCallback, useMemo, useState } from "react";
import { PartsStore, WeldingStore, sendPartialByOrderNumber } from "@/lib/idb";

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

type Mode = 'backend' | 'frontend';

export const useOrdemProducao = () => {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('frontend');

  const tryDetectBackend = useCallback(async (): Promise<Mode> => {
    try {
      const res = await fetch('/api/producao', { method: 'GET', cache: 'no-store' });
      if (res.ok) return 'backend';
      return 'frontend';
    } catch {
      return 'frontend';
    }
  }, []);

  const hashId = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
  };

  const carregarFrontend = useCallback(async () => {
    // Derivar OPs a partir de Parts + Welding
    const [parts, welding] = await Promise.all([PartsStore.list(), WeldingStore.list()]);
    // Agrupar por OP
    const byOP = new Map<string, typeof parts>();
    for (const p of parts) {
      const key = String(p.orderNumber ?? '').trim();
      if (!key) continue;
      const arr = byOP.get(key) || [];
      arr.push(p);
      byOP.set(key, arr as any);
    }

    const ordensCalc: OrdemProducao[] = [];
    for (const [orderNumber, comps] of byOP.entries()) {
      // total de conjuntos planejados: min floor(orderQuantity/fator)
      const total = comps.length
        ? comps.reduce((min, p) => {
            const fator = Math.max(1, Number(p.fator ?? 1));
            const qty = Math.floor(Number(p.orderQuantity ?? 0) / fator);
            return Math.min(min, qty);
          }, Number.POSITIVE_INFINITY)
        : 0;

      // conjuntos enviados por código para esta OP
      const byCodeConjuntos = new Map<string, number>();
      for (const p of comps) {
        const fator = Math.max(1, Number(p.fator ?? 1));
        const items = welding.filter(w => w.orderNumber === orderNumber && w.code === p.code);
        const enviados = items.reduce((acc, it) => {
          if (typeof it.conjuntos === 'number') return acc + (it.conjuntos || 0);
          const deb = Number((it as any).debito ?? 0);
          return acc + Math.floor(deb / fator);
        }, 0);
        byCodeConjuntos.set(p.code, (byCodeConjuntos.get(p.code) || 0) + enviados);
      }

      // Produzido = mínimo dos conjuntos enviados entre todos os códigos da OP
      let produzido = 0;
      if (byCodeConjuntos.size > 0) {
        produzido = Math.min(...Array.from(byCodeConjuntos.values()));
      }

      // itens
      const itens = comps.map<OrdemItem>(p => ({
        id: p.id,
        codigo: p.code,
        tipo: p.componentType,
        localizacao: p.location,
        quantidadePorEngate: Math.max(1, Number(p.fator ?? 1)),
        displayQuantidade: Number(p.itemQuantity ?? 0),
      }));

      const status = total === 0
        ? 'SEM META'
        : produzido >= total
          ? 'CONCLUÍDA'
          : produzido > 0
            ? 'EM ANDAMENTO'
            : 'PENDENTE';

      ordensCalc.push({
        id: /^\d+$/.test(orderNumber) ? Number(orderNumber) : hashId(orderNumber),
        codigo: orderNumber,
        descricao: `OP ${orderNumber}`,
        quantidadeProduzida: produzido,
        quantidadeTotal: Number.isFinite(total) ? total : 0,
        status,
        itens,
      });
    }

    // Ordenar por OP desc
    ordensCalc.sort((a, b) => String(b.codigo).localeCompare(String(a.codigo)));
    setOrdens(ordensCalc);
  }, []);

  const carregarBackend = useCallback(async () => {
    const res = await fetch('/api/producao', { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('Backend indisponível');
    const json = await res.json();
    const data = json?.data ?? json;
    setOrdens(Array.isArray(data) ? data : []);
  }, []);

  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const detected = await tryDetectBackend();
      setMode(detected);
      if (detected === 'backend') await carregarBackend();
      else await carregarFrontend();
    } finally {
      setLoading(false);
    }
  }, [carregarBackend, carregarFrontend, tryDetectBackend]);

  const criarOP = useCallback(async (op: Partial<OrdemProducao>) => {
    // Apenas no backend faria sentido criar OPs; no frontend derivamos das peças.
    // Mantemos compat: insere no estado em memória para visual temporária.
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
    if (mode === 'backend') {
      try { await fetch(`/api/producao/items/${itemId}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantidade }) }); } catch {}
      // otimismo na UI
      setOrdens(prev => prev.map(op => ({
        ...op,
        itens: op.itens.map(it => it.id === itemId ? { ...it, displayQuantidade: (it.displayQuantidade ?? 0) + quantidade } : it)
      })));
      return;
    }
    // frontend: atualizar peça no IDB
    try {
      const allParts = await PartsStore.list();
      const part = allParts.find(p => p.id === itemId);
      if (part) {
        await PartsStore.patch(part.id!, { itemQuantity: (part.itemQuantity ?? 0) + quantidade });
      }
    } finally {
      await carregarOrdens();
    }
  }, [carregarOrdens, mode]);

  const enviarParaSolda = useCallback(async (opId: number, quantidade: number) => {
    if (mode === 'backend') {
      // Atualiza UI de forma otimista
      setOrdens(prev => prev.map(op => op.id === opId ? { ...op, quantidadeProduzida: (op.quantidadeProduzida ?? 0) + quantidade } : op));
      try { await fetch(`/api/producao/${opId}/send-to-welding`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantidade }) }); } catch {}
      return;
    }
    // frontend: enviar parcial por OP usando IndexedDB
    const alvo = ordens.find(o => o.id === opId);
    if (alvo) {
      await sendPartialByOrderNumber({ orderNumber: String(alvo.codigo), conjuntos: quantidade, tag: 'DASHBOARD' });
      await carregarOrdens();
    }
  }, [carregarOrdens, mode, ordens]);

  return {
    ordens,
    loading,
    mode,
    criarOP,
    adicionarQuantidade,
    enviarParaSolda,
    carregarOrdens,
  };
};

export default useOrdemProducao;
