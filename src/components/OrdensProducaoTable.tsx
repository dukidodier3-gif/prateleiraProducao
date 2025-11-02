import React, { useEffect, useState } from 'react';
import { useOrdemProducao } from '../hooks/use-ordem-producao';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Card } from './ui/card';

export function OrdensProducaoTable() {
    const { ordens, loading, criarOP, adicionarQuantidade, enviarParaSolda, carregarOrdens } = useOrdemProducao();
    const { toast } = useToast();
    const [openDialog, setOpenDialog] = useState<'nova-op' | 'quantidade' | 'enviar' | null>(null);
    const [selectedOP, setSelectedOP] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<number | null>(null);
    const [quantidade, setQuantidade] = useState(0);

    useEffect(() => {
        carregarOrdens();
    }, []);

    async function handleAdicionarQuantidade() {
        if (!selectedItem || quantidade <= 0) return;

        try {
            // enviar quantidade parcial
            await adicionarQuantidade(selectedItem, quantidade);
            toast({
                title: "Sucesso",
                description: "Quantidade adicionada com sucesso"
            });
            setOpenDialog(null);
            setSelectedItem(null);
            setQuantidade(0);
        } catch (error) {
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao adicionar quantidade",
                variant: "destructive"
            });
        }
    }

    async function handleEnviarParaSolda() {
        if (!selectedOP || quantidade <= 0) return;

        try {
            await enviarParaSolda(selectedOP, quantidade);
            toast({
                title: "Sucesso",
                description: "Itens enviados para solda com sucesso"
            });
            setOpenDialog(null);
            setSelectedOP(null);
            setQuantidade(0);
        } catch (error) {
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao enviar para solda",
                variant: "destructive"
            });
        }
    }

    return (
        <div className="space-y-4">
            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Ordens de Produção</h2>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Produzido/Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ordens.map(op => (
                            <TableRow key={op.id}>
                                <TableCell>{op.codigo}</TableCell>
                                <TableCell>{op.descricao}</TableCell>
                                <TableCell>{op.quantidadeProduzida}/{op.quantidadeTotal}</TableCell>
                                <TableCell>{op.status}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedOP(op.id!);
                                            setOpenDialog('enviar');
                                        }}
                                    >
                                        Enviar para Solda
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {ordens.map(op => (
                            <TableRow key={op.id + '-itens'} className="bg-muted/50">
                                <TableCell colSpan={5}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Localização</TableHead>
                                                <TableHead>Por Engate</TableHead>
                                                <TableHead>Quantidade</TableHead>
                                                <TableHead>Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {op.itens.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.codigo}</TableCell>
                                                    <TableCell>{item.tipo}</TableCell>
                                                    <TableCell>{item.localizacao}</TableCell>
                                                    <TableCell>{item.quantidadePorEngate}</TableCell>
                                                    <TableCell>{item.displayQuantidade}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedItem(item.id!);
                                                                setOpenDialog('quantidade');
                                                            }}
                                                        >
                                                            Adicionar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Dialog para Adicionar Quantidade */}
            <Dialog open={openDialog === 'quantidade'} onOpenChange={() => setOpenDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Quantidade</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                value={quantidade}
                                onChange={e => setQuantidade(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAdicionarQuantidade}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog para Enviar para Solda */}
            <Dialog open={openDialog === 'enviar'} onOpenChange={() => setOpenDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar para Solda</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                value={quantidade}
                                onChange={e => setQuantidade(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEnviarParaSolda}>Enviar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* (Nova OP removida) */}
        </div>
    );
}