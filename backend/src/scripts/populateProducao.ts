import { ProducaoService } from '../services/ProducaoService';
import { query } from '../database/PostgresClient';

async function main() {
  try {
    const service = ProducaoService.getInstance();
    await service.ensureSchemas();

    // Limpar tabelas
    await query('DELETE FROM itens_ordem_producao');
    await query('DELETE FROM ordens_producao');

    console.log('Banco limpo. Criando 10 ordens de produção de exemplo...');

    for (let i = 1; i <= 10; i++) {
      const op = {
        codigo: `OP-${String(i).padStart(3, '0')}`,
        descricao: `Ordem de produção exemplo ${i}`,
        quantidadeTotal: 20,
        itens: [
          {
            codigo: `C-ITEM-${i}`,
            descricao: `Componente ${i}`,
            tipo: 'COMPONENTE',
            localizacao: `A${i}`,
            quantidadePorEngate: 1
          }
        ]
      } as any;

      await service.criarOrdemProducao(op);
    }

    console.log('Criação finalizada. Verifique GET /api/producao');
  } catch (err) {
    console.error('Erro no script:', err);
  }
}

main();
