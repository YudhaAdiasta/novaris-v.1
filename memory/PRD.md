# NOVARIS - Risk Management System PRD

## Problem
Build an enterprise risk management MVP for a Dana Pensiun / financial institution covering the full risk lifecycle: taxonomy setup, risk assessment with inherent/residual scoring, control evaluation, treatment plans, approval workflow, dashboard, reports and audit trail.

## User Personas
- Admin – system config, all access
- Risk Officer – review/approve risks & treatment plans
- Risk Owner – create & maintain assigned risks, controls, treatments
- Approver / Management – approve high/critical risks & treatments
- Viewer / Auditor – read-only

## Core Modules (P0 - all implemented in MVP 1)
1. JWT login & role-based access
2. Risk Taxonomy (8 categories seeded)
3. Risk Scoring Matrix (5x5 heatmap)
4. Risk Appetite by category
5. Risk Register (filters, search, CSV export)
6. Risk Assessment Form (Identification, Inherent, Controls, Residual, Review)
7. Controls + Effectiveness rating
8. Residual Risk Calculation + Appetite comparison
9. Treatment Plan lifecycle
10. Approval workflow (Risk + Treatment)
11. Dashboard (KPIs + charts + tables)
12. Reports + Audit trail
13. Audit trail logging on all major actions

## Implemented (Feb 2026)
- Backend: FastAPI + MongoDB with full CRUD, JWT auth, role checks, audit logging, dashboard aggregation, CSV export, seeded demo users + categories + appetites + 4 sample risks
- Frontend: React + Tailwind + Shadcn UI, sidebar navigation, all module pages, role-based menu hiding, status & risk level badges, 5x5 heatmap, charts via Recharts

## Backlog
- P1: Email notifications on approval tasks
- P1: File attachments for evidence
- P2: Multi-period historical trend on dashboard
- P2: PDF report export
- P2: Bulk import via CSV
