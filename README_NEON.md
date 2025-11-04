Deploying backend to Neon (Postgres)

Overview
- Neon provides serverless Postgres. We'll use `DATABASE_URL` (connection string) in the backend to connect.
- The repository now contains a Postgres client and schema initializer at `backend/src/database/PostgresClient.ts`.

Steps
1) Create a Neon project and a database. Copy the `DATABASE_URL` connection string.
2) In your deployment environment (server or platform), set the environment variable `DATABASE_URL` to that connection string.
   - If deploying the backend to a VPS/host: add it to the process environment.
   - If deploying as a service (Railway/Render), configure env var in their dashboard.
3) Install dependency in the backend (on your machine or on the server):

   npm install pg

4) Start the backend (or redeploy). On first start the app will attempt to create necessary tables:
   - welding_items
   - parts

Notes about serverless (Neon) and Express
- Neon is serverless Postgres; it works well with a backend that keeps connections short.
- If you deploy the backend as serverless functions (Vercel/Netlify), use connection pooling strategies (e.g., PgBouncer) recommended by Neon.

Data migration
- If you have existing data in SQLite and want to migrate to Neon/Postgres, I can provide a script to export and import the rows.

Next steps I can help with
- Add migration script from SQLite -> Postgres
- Replace SQLite DB usage in backend entirely with Postgres client calls (I added a schema initializer; I can migrate PartsDatabase and WeldingDatabase to use Postgres queries directly)
- Configure connection pooling and prepare the backend for serverless deployment

