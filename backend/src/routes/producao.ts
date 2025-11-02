import { Router, Request, Response } from 'express';
import { query } from '../database/PostgresClient';

const router = Router();

// Util: monta estrutura de OP com itens
async function fetchOrdensComItens() {
	const opsRes = await query(
		'SELECT id, codigo, descricao, quantidade_total as "quantidadeTotal", quantidade_produzida as "quantidadeProduzida", status FROM ordens_producao ORDER BY created_at DESC'
	);
	const itensRes = await query(
		'SELECT id, ordem_id as "ordemId", codigo, descricao, tipo, localizacao, quantidade_por_engate as "quantidadePorEngate", quantidade_adicionada as "quantidadeAdicionada", quantidade_disponivel as "quantidadeDisponivel" FROM itens_ordem_producao'
	);

	const itensByOp = new Map<number, any[]>();
	for (const it of itensRes.rows) {
		const list = itensByOp.get(it.ordemId) || [];
		list.push({
			id: it.id,
			codigo: it.codigo,
			tipo: it.tipo,
			localizacao: it.localizacao,
			quantidadePorEngate: it.quantidadePorEngate ?? 0,
			displayQuantidade: it.quantidadeAdicionada ?? 0,
		});
		itensByOp.set(it.ordemId, list);
	}

	return opsRes.rows.map((op) => ({
		id: op.id,
		codigo: op.codigo,
		descricao: op.descricao,
		quantidadeProduzida: op.quantidadeProduzida ?? 0,
		quantidadeTotal: op.quantidadeTotal ?? 0,
		status: op.status ?? 'PENDENTE',
		itens: itensByOp.get(op.id) || [],
	}));
}

// GET /api/producao - lista ordens com itens
router.get('/', async (_req: Request, res: Response) => {
	try {
		const data = await fetchOrdensComItens();
		res.json({ success: true, data });
	} catch (error) {
		console.error('Erro ao listar ordens de produção:', error);
		res.status(500).json({ success: false, error: 'Erro interno do servidor' });
	}
});

// POST /api/producao/items/:itemId/add - adiciona quantidade ao item
router.post('/items/:itemId/add', async (req: Request, res: Response) => {
	try {
		const itemId = Number(req.params.itemId);
		const { quantidade } = req.body as { quantidade?: number };

		if (!Number.isFinite(itemId) || itemId <= 0) {
			return res.status(400).json({ success: false, error: 'ItemId inválido' });
		}
		if (!Number.isFinite(quantidade as number) || (quantidade as number) <= 0) {
			return res.status(400).json({ success: false, error: 'Quantidade inválida' });
		}

		const upd = await query(
			'UPDATE itens_ordem_producao SET quantidade_adicionada = COALESCE(quantidade_adicionada,0) + $1 WHERE id = $2 RETURNING id, ordem_id',
			[quantidade, itemId]
		);

		if (upd.rowCount === 0) {
			return res.status(404).json({ success: false, error: 'Item não encontrado' });
		}

		return res.json({ success: true, message: 'Quantidade adicionada' });
	} catch (error) {
		console.error('Erro ao adicionar quantidade:', error);
		res.status(500).json({ success: false, error: 'Erro interno do servidor' });
	}
});

// POST /api/producao/:opId/send-to-welding - incrementa produção e (opcional) registra em welding_items
router.post('/:opId/send-to-welding', async (req: Request, res: Response) => {
	try {
		const opId = Number(req.params.opId);
		const { quantidade } = req.body as { quantidade?: number };
		if (!Number.isFinite(opId) || opId <= 0) {
			return res.status(400).json({ success: false, error: 'opId inválido' });
		}
		if (!Number.isFinite(quantidade as number) || (quantidade as number) <= 0) {
			return res.status(400).json({ success: false, error: 'Quantidade inválida' });
		}

		// Atualiza quantidade produzida
		const upd = await query(
			'UPDATE ordens_producao SET quantidade_produzida = COALESCE(quantidade_produzida,0) + $1 WHERE id = $2 RETURNING id, codigo',
			[quantidade, opId]
		);
		if (upd.rowCount === 0) {
			return res.status(404).json({ success: false, error: 'OP não encontrada' });
		}

		// Opcional: criar um registro em welding_items para rastreio agregado
		const codigo = upd.rows[0].codigo as string | null;
		if (codigo) {
			try {
				await query(
					'INSERT INTO welding_items (code, order_number, order_quantity, sent_at) VALUES ($1,$2,$3,$4)',
					[codigo, String(opId), quantidade, new Date().toISOString()]
				);
			} catch (e) {
				// se falhar, não bloquear a resposta da OP
				console.warn('Falha ao registrar em welding_items:', e);
			}
		}

		return res.json({ success: true, message: 'Enviado para solda' });
	} catch (error) {
		console.error('Erro ao enviar para solda:', error);
		res.status(500).json({ success: false, error: 'Erro interno do servidor' });
	}
});

export default router;

