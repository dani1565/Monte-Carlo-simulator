# Project instructions

## Product

- Hebrew RTL Monte Carlo simulator for leveraged investing.
- Every simulation input must be user-editable.
- Do not implement an artificial ruin threshold. Portfolio value has a natural floor of zero only.
- Computation stays in the browser and runs in a Web Worker.
- The product is educational, not investment advice.

## Engineering rules

- Use strict TDD for behavior changes: targeted failing test, minimal implementation, targeted pass, then full gate.
- Keep mathematical logic separate from React components.
- Do not add taxes, fees, financing costs, live market data, accounts, analytics, or cloud storage without owner approval.
- Prefer deterministic scripts over LLM work for mechanical checks.
- Record decisions and verification in `docs/implementation-log.md`; keep long logs in CI artifacts.

## Canonical commands

- Fast gate: `npm run check:fast`
- Full gate: `npm run check:full`
- Release gate: `npm run check:release`
- Production build: `npm run build`

Never merge to `main` or deploy unless the full gate and GitHub checks pass.