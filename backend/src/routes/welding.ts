import { Router, Request, Response } from 'express';
import { query } from '../database/PostgresClient';

const router = Router();

// GET /api/welding - Listar todos os itens de solda
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, code, order_number as "orderNumber", order_quantity as "orderQuantity", sent_at as "sentAt" FROM welding_items ORDER BY sent_at DESC');
    return res.json({ success: true, data: result.rows, message: `${result.rows.length} itens de solda encontrados` });
  } catch (error) {
    console.error('Erro ao buscar itens de solda:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor ao buscar itens de solda' });
  }
});

// GET /api/welding/by-date - Listar itens por período
router.get('/by-date', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate e endDate são obrigatórios' });
    }

    const result = await query(
      'SELECT id, code, order_number as "orderNumber", order_quantity as "orderQuantity", sent_at as "sentAt" FROM welding_items WHERE DATE(sent_at) BETWEEN $1 AND $2 ORDER BY sent_at DESC',
      [startDate, endDate]
    );
    return res.json({ success: true, data: result.rows, message: `${result.rows.length} itens encontrados no período` });
  } catch (error) {
    console.error('Erro ao buscar itens por data:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor ao buscar itens por data' });
  }
});

// POST /api/welding - Adicionar item para solda
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, orderNumber, orderQuantity } = req.body;

    if (!code || !orderNumber || orderQuantity === undefined) {
      return res.status(400).json({ success: false, error: 'code, orderNumber e orderQuantity são obrigatórios' });
    }

    const result = await query(
      'INSERT INTO welding_items (code, order_number, order_quantity, sent_at) VALUES ($1,$2,$3,$4) RETURNING id, code, order_number as "orderNumber", order_quantity as "orderQuantity", sent_at as "sentAt"',
      [code, orderNumber, orderQuantity, new Date().toISOString()]
    );
    return res.status(201).json({ success: true, data: result.rows[0], message: 'Item enviado para solda com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar item de solda:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor ao adicionar item de solda' });
  }
});

// DELETE /api/welding/:id - Deletar item de solda
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Validação do ID
    if (Number.isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    const result = await query('DELETE FROM welding_items WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    return res.json({ success: true, message: 'Item removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar item de solda:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao deletar item de solda'
    });
  }
});

export default router;
