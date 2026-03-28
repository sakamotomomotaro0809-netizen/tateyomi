# .kiro/specs — Spec directories (source of truth)

- Each spec lives in: `.kiro/specs/<spec-slug>/`
- Canonical requirements pipeline:
  - Run: `/sdd-req100 <spec-slug>`
  - Outputs:
    - `requirements.md`
    - `critique.md`
    - `score.json`

## Naming rule (spec-slug)
- kebab-case (e.g. `google-ad-report`, `billing-retry-policy`)

## Quickstart
1) If slug is unknown, run helper:
   - `/req100` (prints `next: /sdd-req100 ...`)
2) Run the pipeline:
   - `/sdd-req100 <spec-slug>`
