# AGRAPos — Multi-Tenant POS

React + Vite + Supabase POS system with Express backend for Xendit.

## Quick Start

```bash
npm install
cp .env.example .env   # fill Supabase + Xendit keys
# Run migrations 001-010 in Supabase SQL Editor
npm run server         # terminal 1 — port 5000
npm run dev            # terminal 2 — https://localhost:5173
```

## Features (implemented)

- Multi-tenant RLS isolation, session auth sync
- POS: PPN, split payment, void/refund, shift kasir, held carts (DB)
- Multi-outlet, subscription plans, platform admin (`#platform-admin`)
- Vertical modules: F&B tables, laundry pipeline, retail SKU stock
- Xendit registration via `server.mjs` + `VITE_API_URL`
