Guia rápido para deploy no Vercel (frontend) e Neon (Postgres)

1) Frontend no Vercel
- Conecte este repositório no Vercel.
- Build command: npm run vercel-build
- Output directory: dist
- Variáveis de ambiente (Project Settings):
  - VITE_API_BASE_URL = https://<url-do-backend>/api

2) Backend e Neon
- Crie um banco no Neon e copie a connection string (DATABASE_URL).
- No host do backend (podendo ser Vercel Serverless ou outro), configure DATABASE_URL.
- Após build do backend, rode: npm run init-db (no diretório backend) para criar schemas.

3) Migração (opcional)
- Se tiver backups SQLite (.bak) e quiser migrar, use o script scripts/migrate-sqlite-to-postgres.cjs

Observação: Neon oferece guias para uso em serverless; prefira pools curtos e use o Pool fornecido pelo pacote pg.

---

Se quiser, posso criar um workflow GitHub Actions que rode a migração de schema automaticamente após deploy, ou adicionar instruções passo-a-passo para adicionar o repositório no Vercel.
