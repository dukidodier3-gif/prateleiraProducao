import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PartsStore, WeldingStore, PartRecord, WeldingItemRecord } from "@/lib/idb";

export type DashboardSummary = {
  totalParts: number;
  totalOPs: number;
  totalStockItems: number; // soma dos itemQuantity
  enviadosHoje: number; // soma de conjuntos enviados hoje
  enviados7d: number; // soma de conjuntos últimos 7 dias
  avisosCount: number; // peças com comment
  quality: { aprovado: number; reprovado: number; neutro: number };
};

export type OPProgress = {
  orderNumber: string;
  totalConjuntosPlanejados: number; // baseado em orderQuantity/fator
  produzidoConjuntos: number; // a partir de welding
  progresso: number; // 0..100
  status: "PENDENTE" | "EM ANDAMENTO" | "CONCLUÍDA" | "SEM META";
};

export type TagDist = { tag: string; value: number };
export type SeriesDia = { date: string; conjuntos: number };
export type TopCodigo = { code: string; conjuntos: number };
export type AvisoItem = { id?: number; code: string; orderNumber: string; location: string; comment: string };
export type OldestPart = { id?: number; code: string; orderNumber: string; tipo: string; days: number; createdAt: string };
export type TagTotals = { MERCADO_LIVRE: number; DEMANDA: number; URGENCIA: number };
export type OPLeadTime = { orderNumber: string; firstCreatedAt: string; firstSentAt?: string; lastSentAt?: string; leadTimeDays?: number; timeToFirstSendDays?: number };
export type TempoMedioResumo = { avgByOPDays: number; byType: Array<{ type: string; avgDays: number; count: number }> };
export type Heatmap = { matrix: number[][]; max: number };

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function rangeDays(n: number) {
  const days: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

export function useDashboard() {
  const { data: parts = [] } = useQuery({
    queryKey: ["parts:list"],
    queryFn: () => PartsStore.list(),
  });

  const { data: welding = [] } = useQuery({
    queryKey: ["welding:list"],
    queryFn: () => WeldingStore.list(),
  });

  const summary: DashboardSummary = useMemo(() => {
    const totalParts = parts.length;
    const totalStockItems = parts.reduce((acc, p) => acc + Number(p.itemQuantity ?? 0), 0);
    const totalOPs = new Set(parts.map(p => String(p.orderNumber || "").trim()).filter(Boolean)).size;
    const avisosCount = parts.filter(p => (p.comment || "").trim().length > 0).length;
    const quality = {
      aprovado: parts.filter(p => p.quality === "APROVADO").length,
      reprovado: parts.filter(p => p.quality === "REPROVADO").length,
      neutro: parts.filter(p => !p.quality || p.quality === "-").length,
    };

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const enviadosHoje = welding.reduce((acc, w) => {
      const d = new Date(w.sentAt);
      const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
      return acc + (isSameDay(today, d) ? conj : 0);
    }, 0);

    const enviados7d = welding.reduce((acc, w) => {
      const d = new Date(w.sentAt);
      const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
      return acc + (d >= sevenDaysAgo ? conj : 0);
    }, 0);

    return { totalParts, totalOPs, totalStockItems, enviadosHoje, enviados7d, avisosCount, quality };
  }, [parts, welding]);

  const opProgress: OPProgress[] = useMemo(() => {
    // Agrupar partes por OP
    const byOP = new Map<string, PartRecord[]>();
    for (const p of parts) {
      const key = String(p.orderNumber || "").trim();
      if (!key) continue;
      const arr = byOP.get(key) || [];
      arr.push(p);
      byOP.set(key, arr);
    }

    const byOPProgress: OPProgress[] = [];
    for (const [orderNumber, comps] of byOP.entries()) {
      // total planejado (meta) usando orderQuantity/fator
      const total = comps.length
        ? comps.reduce((min, it) => {
            const fator = Math.max(1, Number(it.fator ?? 1));
            const qty = Math.floor(Number(it.orderQuantity ?? 0) / fator);
            return Math.min(min, qty);
          }, Number.POSITIVE_INFINITY)
        : 0;

      // conjuntos enviados por código nesta OP
      const byCodeConjuntos = new Map<string, number>();
      for (const p of comps) {
        const fator = Math.max(1, Number(p.fator ?? 1));
        const items = welding.filter(w => w.orderNumber === orderNumber && w.code === p.code);
        const enviados = items.reduce((acc, it) => {
          if (typeof it.conjuntos === "number") return acc + (it.conjuntos || 0);
          const deb = Number((it as any).debito ?? 0);
          return acc + Math.floor(deb / fator);
        }, 0);
        byCodeConjuntos.set(p.code, (byCodeConjuntos.get(p.code) || 0) + enviados);
      }

      let produzido = 0;
      if (byCodeConjuntos.size > 0) {
        produzido = Math.min(...Array.from(byCodeConjuntos.values()));
      }

      const progresso = total > 0 ? Math.min(100, Math.round((produzido / total) * 100)) : 0;
      const status = total === 0 ? "SEM META" : produzido >= total ? "CONCLUÍDA" : produzido > 0 ? "EM ANDAMENTO" : "PENDENTE";

      byOPProgress.push({ orderNumber, totalConjuntosPlanejados: Number.isFinite(total) ? total : 0, produzidoConjuntos: produzido, progresso, status });
    }

    // ordenar por progresso desc
    return byOPProgress.sort((a, b) => b.progresso - a.progresso);
  }, [parts, welding]);

  const weldingSeries14d: SeriesDia[] = useMemo(() => {
    const days = rangeDays(14);
    return days.map(d => {
      const value = welding.reduce((acc, w) => {
        const wt = new Date(w.sentAt);
        const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
        return acc + (isSameDay(wt, d) ? conj : 0);
      }, 0);
      return { date: d.toISOString().slice(0, 10), conjuntos: value };
    });
  }, [welding]);

  const tagsDist: TagDist[] = useMemo(() => {
    const acc = new Map<string, number>();
    for (const w of welding) {
      const tag = (w.tag || "-").toUpperCase();
      const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
      acc.set(tag, (acc.get(tag) || 0) + conj);
    }
    return Array.from(acc.entries()).map(([tag, value]) => ({ tag, value })).sort((a, b) => b.value - a.value);
  }, [welding]);

  const topCodes: TopCodigo[] = useMemo(() => {
    const acc = new Map<string, number>();
    for (const w of welding) {
      const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
      acc.set(w.code, (acc.get(w.code) || 0) + conj);
    }
    return Array.from(acc.entries()).map(([code, conjuntos]) => ({ code, conjuntos })).sort((a, b) => b.conjuntos - a.conjuntos).slice(0, 5);
  }, [welding]);

  const avisos: AvisoItem[] = useMemo(() => {
    return parts
      .filter(p => (p.comment || "").trim().length > 0)
      .slice(0, 8)
      .map(p => ({ id: p.id, code: p.code, orderNumber: p.orderNumber, location: p.location, comment: p.comment || "" }));
  }, [parts]);

  const oldestParts10: OldestPart[] = useMemo(() => {
    const now = new Date();
    const items = parts.map(p => {
      const created = new Date(p.createdAt || new Date().toISOString());
      const diffMs = now.getTime() - created.getTime();
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return { id: p.id, code: p.code, orderNumber: p.orderNumber, tipo: p.componentType, days, createdAt: created.toISOString() } as OldestPart;
    });
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 10);
  }, [parts]);

  const tagTotals: TagTotals = useMemo(() => {
    const totals: TagTotals = { MERCADO_LIVRE: 0, DEMANDA: 0, URGENCIA: 0 };
    for (const w of welding) {
      const tag = (w.tag || "").toUpperCase();
      const conj = typeof w.conjuntos === "number" ? w.conjuntos || 0 : 0;
      if (tag in totals) {
        // @ts-ignore narrow keys
        totals[tag as keyof TagTotals] += conj;
      }
    }
    return totals;
  }, [welding]);

  const recentes = useMemo(() => welding.slice(0, 10), [welding]);

  // Lead time por OP e tempo médio cadastro -> 1º envio
  const opLeadTime: OPLeadTime[] = useMemo(() => {
    // Map OP -> earliest createdAt (parts)
    const partsByOP = new Map<string, PartRecord[]>();
    for (const p of parts) {
      const key = String(p.orderNumber || "").trim();
      if (!key) continue;
      const list = partsByOP.get(key) || [];
      list.push(p);
      partsByOP.set(key, list);
    }
    // Map OP -> welding items
    const weldByOP = new Map<string, WeldingItemRecord[]>();
    for (const w of welding) {
      const key = String(w.orderNumber || "").trim();
      if (!key) continue;
      const list = weldByOP.get(key) || [];
      list.push(w);
      weldByOP.set(key, list);
    }

    const ops = new Set<string>([...Array.from(partsByOP.keys()), ...Array.from(weldByOP.keys())]);
    const res: OPLeadTime[] = [];
    for (const op of ops) {
      const partList = partsByOP.get(op) || [];
      if (partList.length === 0) continue;
      const firstCreatedAt = partList.reduce((min, p) => {
        const d = new Date(p.createdAt || new Date().toISOString());
        return d < min ? d : min;
      }, new Date(partList[0].createdAt || new Date().toISOString()));

      const weldList = weldByOP.get(op) || [];
      let firstSentAt: Date | undefined;
      let lastSentAt: Date | undefined;
      for (const w of weldList) {
        const d = new Date(w.sentAt);
        if (!firstSentAt || d < firstSentAt) firstSentAt = d;
        if (!lastSentAt || d > lastSentAt) lastSentAt = d;
      }
      const toDays = (ms: number) => Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
      const leadTimeDays = lastSentAt ? toDays(lastSentAt.getTime() - firstCreatedAt.getTime()) : undefined;
      const timeToFirstSendDays = firstSentAt ? toDays(firstSentAt.getTime() - firstCreatedAt.getTime()) : undefined;
      res.push({ orderNumber: op, firstCreatedAt: firstCreatedAt.toISOString(), firstSentAt: firstSentAt?.toISOString(), lastSentAt: lastSentAt?.toISOString(), leadTimeDays, timeToFirstSendDays });
    }
    // ordenar desc por lead time (maior primeiro)
    return res.sort((a, b) => (b.leadTimeDays ?? -1) - (a.leadTimeDays ?? -1));
  }, [parts, welding]);

  const tempoMedioResumo: TempoMedioResumo = useMemo(() => {
    // Média por OP (tempo cadastro -> 1º envio)
    const valid = opLeadTime.filter(o => typeof o.timeToFirstSendDays === 'number');
    const avgByOPDays = valid.length ? Math.round(valid.reduce((acc, o) => acc + (o.timeToFirstSendDays as number), 0) / valid.length) : 0;

    // Por tipo: para cada OP e tipo presente nas peças, usar earliest createdAt para aquele tipo na OP e earliest envio da OP
    const byTypeAgg = new Map<string, { sum: number; count: number }>();
    // Precompute earliest send per OP
    const earliestSendByOP = new Map(opLeadTime.filter(o => o.firstSentAt).map(o => [o.orderNumber, new Date(o.firstSentAt!) ]));

    // Group parts by OP and then by type
    const partsByOP = new Map<string, PartRecord[]>();
    for (const p of parts) {
      const key = String(p.orderNumber || '').trim();
      if (!key) continue;
      const list = partsByOP.get(key) || [];
      list.push(p);
      partsByOP.set(key, list);
    }
    for (const [op, list] of partsByOP.entries()) {
      const firstSend = earliestSendByOP.get(op);
      if (!firstSend) continue;
      const byType = new Map<string, Date>();
      for (const p of list) {
        const d = new Date(p.createdAt || new Date().toISOString());
        const t = p.componentType as string;
        const cur = byType.get(t);
        if (!cur || d < cur) byType.set(t, d);
      }
      for (const [t, firstCreated] of byType.entries()) {
        const days = Math.max(0, Math.floor((firstSend.getTime() - firstCreated.getTime()) / (1000 * 60 * 60 * 24)));
        const agg = byTypeAgg.get(t) || { sum: 0, count: 0 };
        agg.sum += days;
        agg.count += 1;
        byTypeAgg.set(t, agg);
      }
    }
    const byType = Array.from(byTypeAgg.entries()).map(([type, { sum, count }]) => ({ type, avgDays: Math.round(sum / count), count })).sort((a, b) => b.avgDays - a.avgDays);
    return { avgByOPDays, byType };
  }, [opLeadTime, parts]);

  // Heatmap: envios por dia da semana (0..6) e hora (0..23)
  const heatmap: Heatmap = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    let max = 0;
    for (const w of welding) {
      const d = new Date(w.sentAt);
      const dow = d.getDay(); // 0=Dom
      const hour = d.getHours();
      const weight = typeof w.conjuntos === 'number' ? (w.conjuntos || 0) : 1;
      matrix[dow][hour] += weight;
      if (matrix[dow][hour] > max) max = matrix[dow][hour];
    }
    return { matrix, max };
  }, [welding]);

  return { summary, opProgress, weldingSeries14d, tagsDist, topCodes, avisos, recentes, oldestParts10, tagTotals, opLeadTime, tempoMedioResumo, heatmap };
}
