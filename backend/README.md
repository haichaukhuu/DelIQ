# DelIQ backend

This is the server-side API for the DelIQ control tower. It connects to two
Supabase projects:

- `DELIQ_*` points to the application database created by
  `db/supabase/migrations/20261106231700_schema.sql`.
- `PLATFORM_*` points to the read-only ERP/WMS/TMS simulator.

The Supabase secret keys must stay on the server and must never be placed in the
Angular application.

## Run locally

```powershell
Copy-Item .env.example .env
# Fill in both Supabase URLs and secret keys in .env
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default.

## API

- `GET /health`
- `GET /api/cases?status=&autonomyPath=&limit=`
- `GET /api/cases/:id`
- `GET /api/source/deliveries?orderNumber=&status=&limit=`
- `GET /api/source/orders/:orderNumber`
- `GET /api/kpis`
- `POST /api/cases/:id/ownership` with `{ "ownerName": "Erik" }`
- `POST /api/cases/:id/resolve` with `{ "resolvedBy": "Erik" }` for Path C manual resolution
- `POST /api/cases/:id/approvals` with
  `{ "recommendationId": "...", "decision": "APPROVED|REJECTED", "decidedBy": "...", "reason": "..." }`
- `POST /api/issue-reports` with
  `{ "reportedBy": "...", "issueType": "...", "description": "...", "caseId": "..." }`

All workflow mutations write to `deliq.audit_log`. Amber approvals are
server-gated to `PENDING_APPROVAL` cases and the €100 per-case policy cap;
Red cases cannot use the approval endpoint. The simulator endpoints only
read the `core`, `commercial`, and `operations` schemas.
