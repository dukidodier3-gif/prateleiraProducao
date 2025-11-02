import { initPostgresSchemas } from './PostgresClient';

(async () => {
  try {
    await initPostgresSchemas();
    console.log('Schemas Postgres inicializados com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao inicializar schemas Postgres:', err);
    process.exit(1);
  }
})();