import { Router, Request, Response } from 'express';
import { query } from '../database/PostgresClient';
import { CreatePartRequest, UpdatePartRequest, PartResponse } from '../models/Part';

const router = Router();

// GET /api/parts - Listar todas as peças ou buscar por query
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    let parts;
    if (search) {
      const dbRes = await query('SELECT * FROM parts WHERE code ILIKE $1 OR order_number ILIKE $1 OR location ILIKE $1 OR component_type ILIKE $1 OR status ILIKE $1 ORDER BY created_at DESC', [`%${search}%`]);
      parts = dbRes.rows;
    } else {
      const dbRes = await query('SELECT * FROM parts ORDER BY created_at DESC');
      parts = dbRes.rows;
    }

    const response: PartResponse = {
      success: true,
      data: parts,
      message: `${parts.length} peças encontradas`
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar peças:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao buscar peças'
    };
    res.status(500).json(response);
  }
});

// GET /api/parts/:id - Buscar peça por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM parts WHERE id = $1', [id]);
    const part = result.rows[0];

    if (!part) {
      const response: PartResponse = {
        success: false,
        error: 'Peça não encontrada'
      };
      return res.status(404).json(response);
    }

    const response: PartResponse = {
      success: true,
      data: part
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar peça:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao buscar peça'
    };
    res.status(500).json(response);
  }
});

// POST /api/parts - Criar nova peça
router.post('/', async (req: Request, res: Response) => {
  try {
    const partData: CreatePartRequest = req.body;

    // Validação básica
    if (!partData.code || !partData.componentType || !partData.orderNumber) {
      const response: PartResponse = {
        success: false,
        error: 'Campos obrigatórios: code, componentType, orderNumber'
      };
      return res.status(400).json(response);
    }

    const result = await query(`INSERT INTO parts (code, component_type, order_number, order_quantity, item_quantity, location, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [
      partData.code,
      partData.componentType,
      partData.orderNumber,
      partData.orderQuantity || 0,
      partData.itemQuantity || 0,
      partData.location || null,
      partData.status || 'INCOMPLETO',
      new Date().toISOString()
    ]);

    const newPart = result.rows[0];

    const response: PartResponse = {
      success: true,
      data: newPart,
      message: 'Peça criada com sucesso'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao criar peça:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao criar peça'
    };
    res.status(500).json(response);
  }
});

// PUT /api/parts/:id - Atualizar peça
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partData: UpdatePartRequest = req.body;

    // Validação básica
    if (!partData.code || !partData.componentType || !partData.orderNumber) {
      const response: PartResponse = {
        success: false,
        error: 'Campos obrigatórios: code, componentType, orderNumber'
      };
      return res.status(400).json(response);
    }

    const result = await query(`UPDATE parts SET code=$1, component_type=$2, order_number=$3, order_quantity=$4, item_quantity=$5, location=$6, status=$7 WHERE id=$8 RETURNING *`, [
      partData.code,
      partData.componentType,
      partData.orderNumber,
      partData.orderQuantity || 0,
      partData.itemQuantity || 0,
      partData.location || null,
      partData.status || 'INCOMPLETO',
      id
    ]);

    const updatedPart = result.rows[0];

    if (!updatedPart) {
      const response: PartResponse = {
        success: false,
        error: 'Peça não encontrada'
      };
      return res.status(404).json(response);
    }

    const response: PartResponse = {
      success: true,
      data: updatedPart,
      message: 'Peça atualizada com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao atualizar peça:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao atualizar peça'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/parts/:id - Deletar peça
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM parts WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      const response: PartResponse = {
        success: false,
        error: 'Peça não encontrada'
      };
      return res.status(404).json(response);
    }

    const response: PartResponse = {
      success: true,
      message: 'Peça removida com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao deletar peça:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao deletar peça'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/parts/bulk/by-code/:code - Deletar todas as peças com o mesmo código
router.delete('/bulk/by-code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const result = await query('DELETE FROM parts WHERE code = $1 RETURNING id', [code]);
    const count = result.rowCount;

    if (count === 0) {
      const response: PartResponse = {
        success: false,
        error: 'Nenhuma peça encontrada com este código'
      };
      return res.status(404).json(response);
    }

    const response: PartResponse = {
      success: true,
      message: `${count} peça(s) removida(s) com sucesso`
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao deletar peças por código:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao deletar peças'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/parts/bulk/by-type/:type - Deletar todas as peças de um tipo
router.delete('/bulk/by-type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const result = await query('DELETE FROM parts WHERE component_type = $1 RETURNING id', [type]);
    const count = result.rowCount;

    if (count === 0) {
      const response: PartResponse = {
        success: false,
        error: 'Nenhuma peça encontrada com este tipo'
      };
      return res.status(404).json(response);
    }

    const response: PartResponse = {
      success: true,
      message: `${count} peça(s) removida(s) com sucesso`
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao deletar peças por tipo:', error);
    const response: PartResponse = {
      success: false,
      error: 'Erro interno do servidor ao deletar peças'
    };
    res.status(500).json(response);
  }
});

export default router;