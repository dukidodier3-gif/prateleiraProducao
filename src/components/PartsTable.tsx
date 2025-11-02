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
import { useCreatePart, useDeletePart, useParts, useUpdatePart, useDeletePartsByCode } from "@/hooks/use-parts";
import { useAddWeldingItem } from "@/hooks/use-welding";
import PasswordConfirmDialog from "./PasswordConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Part {
  id: string;
  code: string;
  componentType: "PLASMA" | "TUBO" | "COMPONENTES" | "PONTEIRA" | "REFORÇO";
  orderNumber: string;
  // quantity representa a quantidade do item (alias de itemQuantity)
  quantity: number;
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  // Busca: input digitado vs termo aplicado
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sendToWeldingOpen, setSendToWeldingOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "edit" | "delete">(null);
  const [pendingPart, setPendingPart] = useState<Part | null>(null);
  const [filterType, setFilterType] = useState<"TODOS" | Part["componentType"]>("TODOS");
  const [filterStatus, setFilterStatus] = useState<"TODOS" | Part["status"]>("TODOS");

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

  const handleSendToWelding = async (code: string, password: string) => {
    if (password !== "brucke") {
      toast.error("Senha incorreta");
      return;
    }

    // Buscar primeira peça com esse código para pegar OP e quantidade
    const partWithCode = parts.find((p) => p.code === code);
    
    if (!partWithCode) {
      toast.error(`Nenhuma peça encontrada com o código ${code}`);
      return;
    }

    try {
      // Enviar para solda
      await addWeldingItem.mutateAsync({
        code: partWithCode.code,
        orderNumber: partWithCode.orderNumber,
        orderQuantity: partWithCode.orderQuantity ?? partWithCode.quantity,
      });

      // Remover todas as peças com esse código
      await deleteByCode.mutateAsync(code);
      
      setSendToWeldingOpen(false);
    } catch (error) {
      console.error("Erro ao enviar para solda:", error);
    }
  };

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
    return matchesQuery && matchesType && matchesStatus;
  }), [parts, searchQuery, filterType, filterStatus]);

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
              <TableHead>Qtd OP</TableHead>
              <TableHead>Posição</TableHead>
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
                  <TableRow key={part.id}>
                    <TableCell className="font-mono font-medium">{part.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.componentType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{part.orderNumber}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{part.itemQuantity ?? part.quantity}</span> un.
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{part.orderQuantity ?? part.quantity}</span> un.
                    </TableCell>
                    <TableCell className="font-medium">{part.location}</TableCell>
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
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(part)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
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
        onConfirm={handleSendToWelding}
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
