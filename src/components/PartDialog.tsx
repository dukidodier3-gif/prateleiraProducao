import { useEffect } from "react";
import { useParts } from "@/hooks/use-parts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Part } from "./PartsTable";

const partSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  componentType: z.enum(["PLASMA", "TUBO", "COMPONENTES", "PONTEIRA", "REFORÇO"], {
    required_error: "Tipo de componente é obrigatório",
  }),
  orderNumber: z.string().min(1, "Número da OP é obrigatório"),
  itemQuantity: z.coerce.number().min(0, "Quantidade do item deve ser no mínimo 0"),
  orderQuantity: z.coerce.number().min(0, "Quantidade da OP deve ser no mínimo 0"),
  location: z.string().min(1, "Posição é obrigatória"),
  status: z.enum(["INCOMPLETO", "COMPLETO"], {
    required_error: "Status é obrigatório",
  }),
});

type PartFormData = z.infer<typeof partSchema>;

interface PartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Part, "id" | "createdAt">) => void;
  initialData?: Omit<Part, "id">;
  mode: "add" | "edit";
}

const PartDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
}: PartDialogProps) => {
  const form = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      code: "",
      componentType: "COMPONENTES",
      orderNumber: "",
      itemQuantity: 0,
      orderQuantity: 0,
      location: "",
      status: "INCOMPLETO",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          code: initialData.code,
          componentType: initialData.componentType,
          orderNumber: initialData.orderNumber,
          itemQuantity: (initialData as any).itemQuantity ?? initialData.quantity,
          orderQuantity: (initialData as any).orderQuantity ?? initialData.quantity,
          location: initialData.location,
          status: initialData.status,
        });
      } else {
        form.reset({
          code: "",
          componentType: "COMPONENTES",
          orderNumber: "",
          itemQuantity: 0,
          orderQuantity: 0,
          location: "",
          status: "INCOMPLETO",
        });
      }
    }
  }, [open, initialData, form]);

  // Obter peças existentes para sugestão ao digitar o código
  const { data: parts = [] } = useParts();

  const handleSubmit = (data: PartFormData) => {
    // quantity continua como alias de itemQuantity para compatibilidade
    const payload = {
      ...(data as any),
      quantity: data.itemQuantity,
    } as Omit<Part, "id" | "createdAt">;
    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Adicionar Nova Peça" : "Editar Peça"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Cadastre uma peça com seu código, OP e posição na prateleira."
              : "Atualize as informações da peça."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código da Peça</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="FT4000"
                        {...field}
                        onChange={(e) => {
                          const upper = (e.target.value || "").toUpperCase();
                          // atualizar o valor do campo code como uppercase
                          field.onChange(upper);

                          // Sugestão: se existir uma peça com esse código, preencher OP e quantidades
                          try {
                            const matched = parts.find(
                              (p) => p.code && p.code.toUpperCase() === upper
                            );
                            if (matched) {
                              const current = form.getValues();
                              // Preencher somente se os campos estiverem vazios / zero
                              if (!current.orderNumber) {
                                form.setValue('orderNumber', matched.orderNumber || '');
                              }
                              if (!current.itemQuantity || current.itemQuantity === 0) {
                                form.setValue('itemQuantity', matched.itemQuantity ?? matched.quantity ?? 0);
                              }
                              if (!current.orderQuantity || current.orderQuantity === 0) {
                                form.setValue('orderQuantity', matched.orderQuantity ?? matched.quantity ?? 0);
                              }
                            }
                          } catch (err) {
                            // ignorar erros de sugestão
                          }
                        }}
                        value={String(field.value ?? "").toUpperCase()}
                      />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="componentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Componente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PLASMA">PLASMA</SelectItem>
                      <SelectItem value="TUBO">TUBO</SelectItem>
                      <SelectItem value="COMPONENTES">COMPONENTES</SelectItem>
                      <SelectItem value="PONTEIRA">PONTEIRA</SelectItem>
                      <SelectItem value="REFORÇO">REFORÇO</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da OP</FormLabel>
                  <FormControl>
                    <Input placeholder="12000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="itemQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade do Item</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade da OP</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição na Prateleira</FormLabel>
                  <FormControl>
                    <Input placeholder="A-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status de Produção</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INCOMPLETO">INCOMPLETO</SelectItem>
                      <SelectItem value="COMPLETO">COMPLETO</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {mode === "add" ? "Adicionar" : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PartDialog;
