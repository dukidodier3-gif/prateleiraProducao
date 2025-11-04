import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, FileDown, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PartDialog from "./PartDialog";
import { toast } from "sonner";
import { SendToWeldingDialog } from "./SendToWeldingDialog";
import { WeldingPartialByOPDialog } from "./WeldingPartialByOPDialog";
import CommentDialog from "@/components/CommentDialog";
import { useCreatePart, useDeletePart, useParts, useUpdatePart, useDeletePartsByCode } from "@/hooks/use-parts";
import { useAddWeldingItem, useWeldingItems } from "@/hooks/use-welding";
import PasswordConfirmDialog from "./PasswordConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatchPart } from "@/hooks/use-parts";

export interface Part {
  id: string;
  code: string;
  componentType: "PLASMA" | "TUBO" | "COMPONENTES" | "PONTEIRA" | "REFORÇO";
  orderNumber: string;
  // quantity representa a quantidade do item (alias de itemQuantity)
  quantity: number;
  // fator do componente para cálculo no envio parcial/total
  fator?: number;
  // comentário/aviso da linha
  comment?: string;
  // qualidade visualizada/ajustada no grid
  quality?: 'APROVADO' | 'REPROVADO' | '-';
  // Campos opcionais para exibir colunas separadas
  itemQuantity?: number;
  orderQuantity?: number;
  location: string;
  status: "INCOMPLETO" | "COMPLETO";
  createdAt: string;
}

const PartsTable = () => {
  const { data: parts = [], isLoading } = useParts();
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();
  const deleteByCode = useDeletePartsByCode();
  const addWeldingItem = useAddWeldingItem();
  const { data: weldingItems = [] } = useWeldingItems();
  const patchPart = usePatchPart();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  // Busca: input digitado vs termo aplicado
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sendToWeldingOpen, setSendToWeldingOpen] = useState(false);
  const [partialByOPOpen, setPartialByOPOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "edit" | "delete">(null);
  const [pendingPart, setPendingPart] = useState<Part | null>(null);
  const [filterType, setFilterType] = useState<"TODOS" | Part["componentType"]>("TODOS");
  const [filterStatus, setFilterStatus] = useState<"TODOS" | Part["status"]>("TODOS");
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<Part | null>(null);

  // Geração de PDF das peças cadastradas no dia
  const isSameDayLocal = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const handleGeneratePdfToday = async () => {
    try {
      const today = new Date();
      const todayParts = (parts || []).filter(p => isSameDayLocal(new Date(p.createdAt), today));

      if (todayParts.length === 0) {
        toast.info("Nenhuma peça cadastrada hoje para gerar PDF.");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      const title = `Peças cadastradas em ${today.toLocaleDateString('pt-BR')}`;
      doc.setFontSize(14);
      doc.text(title, 14, 14);

      const head = [["Código", "Tipo", "OP", "Qtd Item", "Qtd OP", "Posição", "Status", "Cadastrado em"]];
      const body = todayParts.map(p => [
        p.code,
        p.componentType,
        p.orderNumber,
        String(p.itemQuantity ?? p.quantity),
        String(p.orderQuantity ?? p.quantity),
        p.location,
        p.status,
        new Date(p.createdAt).toLocaleString('pt-BR')
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 20,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [33, 37, 41] },
      });

      const filename = `pecas_${today.toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      toast.success("PDF gerado com sucesso.");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleAddPart = (part: Omit<Part, "id" | "createdAt">) => {
    createPart.mutate(part, {
      onSuccess: () => {
        toast.success("Peça adicionada com sucesso!");
      },
      onError: () => toast.error("Erro ao adicionar peça"),
    });
  };

  const handleEditPart = (part: Omit<Part, "id" | "createdAt">) => {
    if (editingPart) {
      updatePart.mutate({ id: editingPart.id, partData: part }, {
        onSuccess: () => toast.success("Peça atualizada com sucesso!"),
        onError: () => toast.error("Erro ao atualizar peça"),
      });
    }
  };

  const handleDeletePart = (id: string) => {
    deletePart.mutate(id, {
      onSuccess: () => toast.success("Peça removida com sucesso!"),
      onError: () => toast.error("Erro ao remover peça"),
    });
  };

  // fluxo de envio foi movido para dentro do próprio diálogo (parcial/total por engate)

  const openEditDialog = (part: Part) => {
    setPendingPart(part);
    setConfirmAction("edit");
    setConfirmOpen(true);
  };

  const openAddDialog = () => {
    setEditingPart(null);
    setDialogOpen(true);
  };

  // Removido status de estoque do grid conforme solicitado

  // Mapa de engates enviados por (code + OP)
  const engatesPorEngate = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of weldingItems) {
      const key = `${w.code}__${w.orderNumber}`;
      const c = Number(w.conjuntos ?? 0);
      m.set(key, (m.get(key) ?? 0) + (Number.isFinite(c) ? c : 0));
    }
    return m;
  }, [weldingItems]);

  const filteredParts = useMemo(() => (parts || []).filter((part) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = (
      part.code.toLowerCase().includes(query) ||
      part.orderNumber.toLowerCase().includes(query) ||
      part.componentType.toLowerCase().includes(query) ||
      part.location.toLowerCase().includes(query) ||
      part.status.toLowerCase().includes(query)
    );
    const matchesType = filterType === "TODOS" || part.componentType === filterType;
    const matchesStatus = filterStatus === "TODOS" || part.status === filterStatus;
    if (!(matchesQuery && matchesType && matchesStatus)) return false;
    // Ocultar quando Solda/Qnt OP atingir ou ultrapassar 100%
    const key = `${part.code}__${part.orderNumber}`;
    const enviados = engatesPorEngate.get(key) ?? 0;
    const qntOP = Number(part.orderQuantity ?? part.quantity ?? 0);
    const concluido = qntOP > 0 && enviados >= qntOP;
    return !concluido;
  }), [parts, searchQuery, filterType, filterStatus, engatesPorEngate]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredParts.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * itemsPerPage;
  const paginatedParts = filteredParts.slice(start, start + itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Localização dos Itens</h2>
          <p className="text-sm text-muted-foreground">Gerencie peças de produção e suas posições</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGeneratePdfToday} className="gap-2">
            <FileDown className="w-4 h-4" /> Gerar PDF (Hoje)
          </Button>
          <Button variant="outline" onClick={() => setPartialByOPOpen(true)} className="gap-2">
            <Flame className="w-4 h-4" /> Enviar parcial (OP)
          </Button>
          <Button variant="outline" onClick={() => setSendToWeldingOpen(true)} className="gap-2">
            <Flame className="w-4 h-4" /> Enviar para Solda
          </Button>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Peça
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, OP, tipo ou posição..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-28"
            aria-label="Buscar"
            onKeyDown={(e) => {
              // Não buscar no Enter; apenas no clique do botão
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          />
          <Button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3"
            variant="default"
            onClick={() => {
              setSearchQuery(searchInput.trim());
              setCurrentPage(1);
            }}
            aria-label="Aplicar busca"
          >
            <Search className="w-4 h-4 mr-1" /> Buscar
          </Button>
        </div>
        <div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              <SelectItem value="PLASMA">PLASMA</SelectItem>
              <SelectItem value="TUBO">TUBO</SelectItem>
              <SelectItem value="COMPONENTES">COMPONENTES</SelectItem>
              <SelectItem value="PONTEIRA">PONTEIRA</SelectItem>
              <SelectItem value="REFORÇO">REFORÇO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos status</SelectItem>
              <SelectItem value="INCOMPLETO">INCOMPLETO</SelectItem>
              <SelectItem value="COMPLETO">COMPLETO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Qtd Item</TableHead>
              <TableHead>Solda / Qnt OP</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Qualidade</TableHead>
              <TableHead>Status Produção</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando peças...
                </TableCell>
              </TableRow>
            ) : filteredParts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? "Nenhuma peça encontrada com os critérios de busca."
                    : "Nenhuma peça cadastrada. Clique em 'Adicionar Peça' para começar."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedParts.map((part) => {
                return (
                  <TableRow key={part.id} className={part.comment ? "ring-2 ring-yellow-400" : undefined}>
                    <TableCell className="font-mono font-medium">{part.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.componentType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{part.orderNumber}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{part.itemQuantity ?? part.quantity}</span> un.
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const key = `${part.code}__${part.orderNumber}`;
                        const enviados = engatesPorEngate.get(key) ?? 0;
                        const qntOP = Number(part.orderQuantity ?? part.quantity ?? 0);
                        return (
                          <span className="font-semibold">{enviados} / {qntOP}</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(() => {
                        const raw = String(part.location || '').toUpperCase();
                        const ok = /^\d+P-\d+A-\d+N$/.test(raw);
                        if (ok) return <span className="inline-block min-w-[180px] font-semibold text-lg font-mono">{raw}</span>;
                        const nums = (raw.match(/\d+/g) || []).slice(0, 3);
                        if (nums.length === 3) {
                          const [p, a, n] = nums;
                          const formatted = `${p}P-${a}A-${n}N`;
                          return <span className="inline-block min-w-[180px] font-semibold text-lg font-mono">{formatted}</span>;
                        }
                        return <span className="inline-block min-w-[180px] font-semibold text-lg font-mono">{raw}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={part.quality ?? '-'}
                        onValueChange={(v) => patchPart.mutate({ id: part.id, patch: { quality: v as any } })}
                      >
                        <SelectTrigger className={
                          part.quality === 'REPROVADO' ? 'border-red-500 text-red-700' : part.quality === 'APROVADO' ? 'border-green-500 text-green-700' : ''
                        }>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">-</SelectItem>
                          <SelectItem value="APROVADO">APROVADO</SelectItem>
                          <SelectItem value="REPROVADO">REPROVADO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={part.status === "COMPLETO" ? "success" : "warning"}>
                        {part.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(part.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={part.comment ? "border-yellow-500 text-yellow-700" : undefined}
                          onClick={() => { setCommentTarget(part); setCommentOpen(true); }}
                        >
                          Aviso
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(part)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {/* Envio parcial incorporado ao diálogo de envio total (por engate) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPendingPart(part);
                            setConfirmAction("delete");
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="gap-1"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <PartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingPart ? handleEditPart : handleAddPart}
        initialData={editingPart || undefined}
        mode={editingPart ? "edit" : "add"}
      />

      <SendToWeldingDialog
        open={sendToWeldingOpen}
        onOpenChange={setSendToWeldingOpen}
      />

      <WeldingPartialByOPDialog
        open={partialByOPOpen}
        onOpenChange={setPartialByOPOpen}
      />

      <CommentDialog
        open={commentOpen}
        onOpenChange={setCommentOpen}
        partId={commentTarget?.id || ''}
        initialComment={commentTarget?.comment || ''}
      />

      {/* Confirmação por senha para editar/excluir */}
      <PasswordConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "edit" ? "Confirmar Edição" : "Confirmar Exclusão"}
        description={confirmAction === "edit" ? "Digite a senha para editar esta peça." : "Digite a senha para excluir esta peça."}
        onConfirm={() => {
          if (!pendingPart || !confirmAction) return;
          if (confirmAction === "edit") {
            setEditingPart(pendingPart);
            setDialogOpen(true);
          } else if (confirmAction === "delete") {
            handleDeletePart(pendingPart.id);
          }
          setPendingPart(null);
          setConfirmAction(null);
        }}
      />
    </div>
  );
};

export default PartsTable;
