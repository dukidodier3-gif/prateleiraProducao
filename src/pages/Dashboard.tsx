import Header from "@/components/Header";
import { useDashboard } from "@/hooks/use-dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Package, Hash, Boxes, TrendingUp, Clock3, Send, Tag } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"]; // azul, verde, amarelo, vermelho, roxo, ciano, lima

const Dashboard = () => {
  const { summary, /* opProgress, */ weldingSeries14d, tagsDist, /* topCodes, avisos, */ recentes, oldestParts10, tagTotals, opLeadTime, tempoMedioResumo, heatmap } = useDashboard();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header/Hero */}
        <div className="rounded-xl border bg-gradient-to-r from-blue-600/10 via-emerald-600/10 to-purple-600/10 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Visão geral de produção e envios • atualizado em tempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-background/60 backdrop-blur p-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <div className="text-sm"><span className="font-semibold">{summary.enviadosHoje}</span> hoje</div>
              </div>
              <div className="rounded-lg border bg-background/60 backdrop-blur p-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <div className="text-sm"><span className="font-semibold">{summary.enviados7d}</span> últimos 7 dias</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards resumo (somente Home) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">ITENS CADASTRADOS</div>
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-1">{summary.totalParts}</div>
            <div className="mt-3 -mb-4">
              <ChartContainer
                config={{ envios: { label: "ENV", color: "hsl(221.2 83.2% 53.3%)" } }}
                className="h-16 w-full"
              >
                <AreaChart data={weldingSeries14d} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="strokeBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-envios)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--color-envios)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="conjuntos" stroke="var(--color-envios)" fill="url(#strokeBlue)" />
                </AreaChart>
              </ChartContainer>
            </div>
          </Card>
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">OPS DIFERENTES</div>
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-1">{summary.totalOPs}</div>
            <div className="text-xs text-muted-foreground mt-1">OPs ativas no sistema</div>
          </Card>
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">ITENS EM ESTOQUE</div>
              <Boxes className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-1">{summary.totalStockItems}</div>
            <div className="text-xs text-muted-foreground mt-1">Soma das quantidades em estoque</div>
          </Card>
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">MÉDIA ATÉ 1º ENVIO</div>
              <Clock3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-1">{tempoMedioResumo.avgByOPDays}d</div>
            <div className="text-xs text-muted-foreground mt-1">Por OP (cadastro → 1º envio)</div>
          </Card>
        </div>

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">ENVIOS ÚLTIMOS 14 DIAS</div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <ChartContainer
                className="h-64 w-full"
                config={{ conjuntos: { label: "Conjuntos", color: "hsl(221.2 83.2% 53.3%)" } }}
              >
                <AreaChart data={weldingSeries14d}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="area14" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-conjuntos)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-conjuntos)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="conjuntos" stroke="var(--color-conjuntos)" fill="url(#area14)" type="monotone" />
                </AreaChart>
              </ChartContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">TAGS (SOLDA)</div>
              <Tag className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <ChartContainer
                className="h-64 w-full"
                config={{ valor: { label: "Conjuntos", color: "hsl(142.1 76.2% 36.3%)" } }}
              >
                <BarChart data={tagsDist.map(t => ({ tag: t.tag, valor: t.value }))} layout="vertical" margin={{ left: 16, right: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="tag" tickLine={false} axisLine={false} width={90} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="valor" radius={4} stroke="var(--color-valor)" fill="var(--color-valor)" />
                </BarChart>
              </ChartContainer>
            </div>
          </Card>
        </div>

        {/* Tempo em processo (mais antigos na Home) + Totais por Tag (Solda) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-2">
            <div className="text-sm text-muted-foreground">TEMPO EM PROCESSO</div>
            <div className="mt-3 space-y-2">
              {oldestParts10.length === 0 ? (
                <div className="text-muted-foreground py-6">Cadastre peças na Home para ver aqui.</div>
              ) : (
                oldestParts10.map((p) => (
                  <div key={`${p.id}-${p.createdAt}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border rounded-lg p-3 hover:shadow-sm transition">
                    <div className="font-mono font-medium">{p.code}</div>
                    <div className="text-sm text-muted-foreground">OP {p.orderNumber}</div>
                    <div className="text-sm">
                      <Badge variant="outline">{p.tipo}</Badge>
                    </div>
                    <div className="text-right text-sm flex items-center justify-end gap-2">
                      <Clock3 className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline">{p.days} dia(s)</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">TOTAIS POR TAG (SOLDA)</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">MERCADO LIVRE</div>
                <div className="text-xl font-semibold">{tagTotals.MERCADO_LIVRE}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">DEMANDA</div>
                <div className="text-xl font-semibold">{tagTotals.DEMANDA}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">URGENCIA</div>
                <div className="text-xl font-semibold">{tagTotals.URGENCIA}</div>
              </div>
            </div>
          </Card>
        </div>


        {/* Recentes de Solda */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">ENVIOS PARA SOLDA (RECENTES)</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentes.length === 0 ? (
              <div className="text-muted-foreground py-6">Sem envios ainda.</div>
            ) : (
              recentes.map((w) => (
                <div key={w.id} className="rounded-lg border p-3 hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{w.code}</span>
                    <Badge variant="outline">{w.tag || '-'}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">OP {w.orderNumber}</div>
                  <div className="text-sm mt-1">Engates: <span className="font-semibold">{typeof w.conjuntos === 'number' ? w.conjuntos : '-'}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(w.sentAt).toLocaleString('pt-BR')}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* LEAD TIME POR OP + TEMPO MÉDIO EM PROCESSO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">LEAD TIME POR OP</div>
            <div className="mt-3 space-y-2">
              {opLeadTime.filter(o => typeof o.leadTimeDays === 'number').length === 0 ? (
                <div className="text-muted-foreground py-6">Sem dados suficientes (envios necessários).</div>
              ) : (
                opLeadTime
                  .filter(o => typeof o.leadTimeDays === 'number')
                  .slice(0, 10)
                  .map(o => (
                    <div key={o.orderNumber} className="grid grid-cols-3 gap-2 items-center border rounded-lg p-3 hover:shadow-sm transition">
                      <div className="text-sm text-muted-foreground">OP {o.orderNumber}</div>
                      <div className="text-sm">Até 1º envio: <span className="font-semibold">{typeof o.timeToFirstSendDays === 'number' ? `${o.timeToFirstSendDays}d` : '-'}</span></div>
                      <div className="text-right text-sm"><Badge variant="outline">Último envio: {o.leadTimeDays}d</Badge></div>
                    </div>
                  ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-muted-foreground">TEMPO MÉDIO EM PROCESSO</div>
            <div className="mt-3 space-y-3">
              <div className="rounded-md border p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">MÉDIA ATÉ 1º ENVIO (POR OP)</div>
                <div className="text-2xl font-bold">{tempoMedioResumo.avgByOPDays}d</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">POR TIPO</div>
                <div className="space-y-2 max-h-64 overflow-auto pr-1">
                  {tempoMedioResumo.byType.length === 0 ? (
                    <div className="text-muted-foreground py-4">Sem dados suficientes.</div>
                  ) : (
                    tempoMedioResumo.byType.map((t) => (
                      <div key={t.type} className="grid grid-cols-3 gap-2 items-center border rounded-lg p-3 hover:shadow-sm transition">
                        <div className="text-sm font-medium truncate" title={t.type}>{t.type}</div>
                        <div className="text-sm text-muted-foreground">OPs: {t.count}</div>
                        <div className="text-right text-sm"><Badge variant="outline">{t.avgDays}d</Badge></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* MAPA DE CALOR DE ENVIOS */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">MAPA DE CALOR DE ENVIOS (DIA DA SEMANA × HORA)</div>
          <div className="mt-3">
            {heatmap.max === 0 ? (
              <div className="text-muted-foreground py-6">Sem envios ainda.</div>
            ) : (
              <div className="overflow-auto">
                <div className="inline-block">
                  {/* Cabeçalho das horas */}
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                    <div></div>
                    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="text-[10px] text-center text-muted-foreground">{h}</div>
                      ))}
                    </div>
                  </div>
                  {/* Linhas do heatmap */}
                  {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((label, dow) => (
                    <div key={label} className="grid grid-cols-[auto_1fr] gap-2 items-center mt-1">
                      <div className="text-xs w-8 text-right text-muted-foreground">{label}</div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const value = heatmap.matrix[dow][hour];
                          const intensity = heatmap.max > 0 ? value / heatmap.max : 0;
                          // mapear 0..1 -> gradiente verde->amarelo->vermelho
                          // hue 130 (verde) até 0 (vermelho)
                          const hue = Math.max(0, 130 - Math.round(intensity * 130));
                          const light = 52 - Math.round(intensity * 20);
                          const sat = 85;
                          const bg = `hsl(${hue} ${sat}% ${light}%)`;
                          return (
                            <div key={hour} className="w-5 h-5 rounded-sm border border-border/60" title={`${label} ${hour}h: ${value}`} style={{ backgroundColor: bg }} />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Legenda */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>Baixo</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const intensity = i / 9;
                        const hue = Math.max(0, 130 - Math.round(intensity * 130));
                        const light = 52 - Math.round(intensity * 20);
                        const sat = 85;
                        return <div key={i} className="w-5 h-3 rounded-sm border border-border/60" style={{ backgroundColor: `hsl(${hue} ${sat}% ${light}%)` }} />
                      })}
                    </div>
                    <span>Alto</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
