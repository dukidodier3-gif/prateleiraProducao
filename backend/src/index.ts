import express from 'express';
import cors from 'cors';
import partsRouter from './routes/parts';
import weldingRouter from './routes/welding';

const app = express();
const PORT = process.env.PORT || 3001;

// If DATABASE_URL is provided (Neon), initialize Postgres schemas
if (process.env.DATABASE_URL) {
  try {
    // lazy import to avoid requiring pg in environments that don't have it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initPostgresSchemas } = require('./database/PostgresClient');
    initPostgresSchemas()
      .then(() => console.log('✅ Postgres schemas ensured'))
      .catch((err: unknown) => console.error('Erro init Postgres schemas', err));
  } catch (err: unknown) {
    console.warn('Postgres initialization skipped (pg not installed)', String(err));
  }
}

// Middleware
app.use(cors({
  // Em Electron (file://) a origem é nula; permitir qualquer origem para funcionamento local
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging (silencia HEAD usados pelo wait-on)
app.use((req, res, next) => {
  if (req.method !== 'HEAD') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Rotas
app.use('/api/parts', partsRouter);
app.use('/api/welding', weldingRouter);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API do Sistema de Inventário funcionando'
  });
});

// Rota de fallback
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint não encontrado',
    availableRoutes: [
      'GET /health',
      'GET /api/parts',
      'GET /api/parts/:id',
      'POST /api/parts',
      'PUT /api/parts/:id',
      'DELETE /api/parts/:id'
    ]
  });
});

// Tratamento de erros global
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 API disponível em: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Peças endpoint: http://localhost:${PORT}/api/parts`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Desligando servidor...');
  process.exit(0);
});

export default app;