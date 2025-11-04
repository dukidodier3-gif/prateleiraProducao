import { query, initPostgresSchemas } from '../database/PostgresClient';

export class ProducaoService {
  private static instance: ProducaoService;

  private constructor() {}

  static getInstance() {
    if (!ProducaoService.instance) {
      ProducaoService.instance = new ProducaoService();
    }
    return ProducaoService.instance;
  }

  async ensureSchemas() {
    await initPostgresSchemas();
  }

  async listarOrdensProducao() {
    const res = await query('SELECT * FROM ordens_producao ORDER BY created_at DESC');
    const ordens = res.rows || [];
    for (const o of ordens) {
      const itensRes = await query('SELECT * FROM itens_ordem_producao WHERE ordem_id = $1 ORDER BY id', [o.id]);
      o.itens = itensRes.rows || [];
    }
    return ordens;
  }

  async getOrdemProducao(id: number) {
    const res = await query('SELECT * FROM ordens_producao WHERE id = $1', [id]);
    const ordem = res.rows[0];
    if (!ordem) return null;
    const itensRes = await query('SELECT * FROM itens_ordem_producao WHERE ordem_id = $1 ORDER BY id', [id]);
    ordem.itens = itensRes.rows || [];
    return ordem;
  }

  async criarOrdemProducao(op: any) {
    const res = await query(`INSERT INTO ordens_producao (codigo, descricao, quantidade_total, quantidade_produzida, status, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [
      op.codigo,
      op.descricao || null,
      op.quantidadeTotal || 0,
      op.quantidadeProduzida || 0,
      op.status || 'PENDENTE',
      new Date().toISOString()
    ]);
    const ordem = res.rows[0];
    if (op.itens && Array.isArray(op.itens) && op.itens.length) {
      for (const it of op.itens) {
        await query(`INSERT INTO itens_ordem_producao (ordem_id, codigo, descricao, tipo, localizacao, quantidade_por_engate, quantidade_adicionada, quantidade_disponivel) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
          ordem.id,
          it.codigo,
          it.descricao || null,
          it.tipo || null,
          it.localizacao || null,
          it.quantidadePorEngate || 0,
          it.quantidadeAdicionada || 0,
          it.quantidadeDisponivel || 0
        ]);
      }
    }
    return this.getOrdemProducao(ordem.id);
  }

  async adicionarQuantidadeItem(itemId: number, quantidade: number) {
    const res = await query('SELECT * FROM itens_ordem_producao WHERE id = $1', [itemId]);
    const item = res.rows[0];
    if (!item) throw new Error('Item não encontrado');
    const novo = (item.quantidade_adicionada || 0) + quantidade;
    await query('UPDATE itens_ordem_producao SET quantidade_adicionada = $1 WHERE id = $2', [novo, itemId]);
    const updated = await query('SELECT * FROM itens_ordem_producao WHERE id = $1', [itemId]);
    return updated.rows[0];
  }
}

export default ProducaoService;
