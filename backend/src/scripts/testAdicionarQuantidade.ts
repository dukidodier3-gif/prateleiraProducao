import { ProducaoService } from '../services/ProducaoService';

async function main() {
  try {
    const service = ProducaoService.getInstance();
    await service.ensureSchemas();
  const ordens = await service.listarOrdensProducao();
    if (ordens.length === 0) {
      console.log('Nenhuma OP encontrada');
      return;
    }
    const op = ordens[0];
    const item = (op.itens && op.itens[0]) as any;
    if (!item) {
      console.log('Nenhum item encontrado na primeira OP');
      return;
    }

    console.log('Antes:', item);

    // Adiciona 10 unidades
    await service.adicionarQuantidadeItem(item.id!, 10);

    // Recarrega OP
    const opAtual = await service.getOrdemProducao(op.id!);
    const itemAtual = opAtual?.itens.find((i: any) => i.id === item.id);
    console.log('Depois:', itemAtual);
  } catch (err) {
    console.error('Erro no teste:', err);
  }
}

main();
