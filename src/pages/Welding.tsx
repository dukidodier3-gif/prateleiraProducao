import { useState } from "react";
import { FileDown, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeldingItems, useWeldingItemsByDate, useDeleteWeldingItem } from "@/hooks/use-welding";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";

const Welding = () => {
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const { data: allItems = [], isLoading: loadingAll } = useWeldingItems();
  const { data: filteredItems = [], isLoading: loadingFiltered } = useWeldingItemsByDate(
    startDate,
    endDate,
    filterEnabled
  );
  const deleteItem = useDeleteWeldingItem();

  const items = filterEnabled ? filteredItems : allItems;
  const isLoading = filterEnabled ? loadingFiltered : loadingAll;

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      toast.error("Selecione as datas de início e fim");
      return;
    }
    setFilterEnabled(true);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilterEnabled(false);
  };

  const handleGeneratePdf = async () => {
    if (items.length === 0) {
      toast.info("Nenhum item para gerar PDF");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      
      let title = "Itens Enviados para Solda";
      if (filterEnabled && startDate && endDate) {
        const start = new Date(startDate).toLocaleDateString('pt-BR');
        const end = new Date(endDate).toLocaleDateString('pt-BR');
        title += ` (${start} - ${end})`;
      }
      
      doc.setFontSize(14);
      doc.text(title, 14, 14);

      const head = [["#", "Código", "OP", "QNTS ENGATES", "Tag", "Data de Envio"]];
      const body = items.map((item, index) => [
        String(index + 1),
        item.code,
        item.orderNumber,
        item.conjuntos !== undefined ? String(item.conjuntos) : "-",
        item.tag || "-",
        new Date(item.sentAt).toLocaleString('pt-BR')
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 20,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [33, 37, 41] },
      });

      const filename = filterEnabled 
        ? `solda_${startDate}_${endDate}.pdf`
        : `solda_todos_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      doc.save(filename);
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja realmente remover este item?")) {
      deleteItem.mutate(id);
    }
  };

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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Itens Enviados para Solda</h2>
            <p className="text-sm text-muted-foreground">
              Registro de peças enviadas para o setor de solda
            </p>
          </div>
          <Button onClick={handleGeneratePdf} className="gap-2">
            <FileDown className="w-4 h-4" />
            Gerar PDF
          </Button>
        </div>

        {/* Filtro por Data */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 grid gap-2">
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 grid gap-2">
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleApplyFilter} className="gap-2">
              <Calendar className="w-4 h-4" />
              Filtrar
            </Button>
            {filterEnabled && (
              <Button onClick={handleClearFilter} variant="outline">
                Limpar Filtro
              </Button>
            )}
          </div>
          {filterEnabled && (
            <p className="text-sm text-muted-foreground mt-2">
              Exibindo {items.length} item(ns) no período selecionado
            </p>
          )}
        </div>

        {/* Tabela */}
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Número OP</TableHead>
                <TableHead>QNTS ENGATES</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando itens...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {filterEnabled
                      ? "Nenhum item encontrado no período selecionado."
                      : "Nenhum item enviado para solda ainda."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono font-medium">{item.code}</TableCell>
                    <TableCell className="font-mono">{item.orderNumber}</TableCell>
                    <TableCell>
                      {item.conjuntos !== undefined ? (
                        <span className="font-semibold">{item.conjuntos}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.tag ? <Badge variant="outline">{item.tag.replace('_',' ')}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.sentAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!filterEnabled && items.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Total de {items.length} item(ns) enviado(s) para solda
          </div>
        )}
      </div>
    </div>
  );
};

export default Welding;
