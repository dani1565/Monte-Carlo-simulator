# Implementation log

## 2026-08-12 — Production v1 kickoff

- Owner approved autonomous implementation of the production roadmap.
- Created branch `feat/production-v1` from the existing simulator PR branch.
- Token-efficiency policy: deterministic npm scripts for repeated checks; targeted tests during TDD; full checks only at quality gates; concise project context in `AGENTS.md`.
- A dedicated skill will be created only after a workflow proves reusable at least three times.
- Baseline: unit tests pass (3/3); lint and build fail in `Charts.tsx`; TypeScript config also emits TS5096.
- Decision: remove the artificial ruin threshold entirely; retain only the natural zero floor.

## Verification record

| Stage | Command | Result |
|---|---|---|
| Baseline | `npm test` | PASS — 3 tests |
| Baseline | `npm run lint` | FAIL — `Charts.tsx` parse error |
| Baseline | `npm run build` | FAIL — chart syntax and TS5096 |
| Foundation | `npm run check:fast && npm run build` | PASS — 3 tests and production build |
| Zero-floor model | targeted engine test | RED — 2 expected failures before implementation |
| Zero-floor model | `npm run check:full` | PASS — 4 tests, lint, legacy-term check and build |
| Parameter foundation | `npm run check:full` | PASS — legacy-term check, lint, 26/26 tests (4 files), TypeScript and Vite production build |
| Storage and sharing | `npm run check:full` | PASS — 30/30 tests and production build |
| Browser gate | `npm run test:e2e` | PASS — 6/6 scenarios on desktop and mobile Chromium |
| Review fixes | targeted regression tests | RED then PASS — storage blocking and chart units |
| Release after review | `npm run check:release` | PASS — 33/33 tests, build, and 6/6 browser scenarios |
| Final blocker fixes | `npm run check:release` | PASS — 34/34 tests, build, and 6/6 browser scenarios |

## 2026-08-12 — Foundation and zero-floor model

- Added canonical deterministic quality commands to `package.json` and a legacy-term checker under `scripts/`.
- Added `AGENTS.md` to provide compact, stable context for coding agents.
- Fixed the chart parser error and TypeScript project configuration; production builds now succeed.
- Removed `ruinThreshold` from parameters, engine, UI and README.
- Renamed result fields to `wipeoutRate`/`wipedOutCount`; a portfolio is now set to zero only when the leveraged daily return naturally reaches zero.
- Token use: no model delegation was used for deterministic fixes; targeted tests supplied RED/GREEN evidence, and one full gate replaced separate repeated checks.

## 2026-08-12 — User-editable parameter foundation

- Centralized v1 defaults and numeric limits in `simulation/defaults.ts`; validation now returns field-specific Hebrew errors for every engine input.
- Added `initialInvestment` and configurable `tradingDays` to `SimulationParams`; the engine now starts paths at the entered amount and uses the entered day count for annual-to-daily conversion.
- Replaced fixed controls with the accessible reusable `ParameterField`: precise number entry, optional synchronized range input, units, descriptions, and linked errors.
- Kept all basic and advanced controls visible. Leverages accept comma-separated custom decimal values rather than a fixed 1×–5× set.
- Invalid drafts remain editable, terminate/prevent automatic work, and disable the explicit run button until corrected.
- Results now show currency and multiples relative to the initial investment. No URL, localStorage, or E2E work was included in this slice.
- TDD evidence: validation suite RED on missing modules then GREEN (12 tests); engine behavior RED on amount/day handling then GREEN (6 tests); `ParameterField` RED on missing component then GREEN (3 tests).

## Historical independent review findings — resolved in PR #2

An independent fail-closed review ran while the parameter slice was in its RED/in-progress state. The findings below were blockers at that point; they were resolved before the production-v1 merge and are retained only as historical evidence:

- `initialInvestment` must initialize portfolio values and all returned money values consistently.
- `tradingDays` must replace the hard-coded 252 in drift, volatility and loop calculations.
- App defaults and every engine test must use complete validated parameters.
- `npm run check:full` must pass after the worktree stabilizes.
- A fresh independent review must inspect the completed diff; the interim failure cannot be reused as approval.

## 2026-08-12 — Persistence, sharing and browser verification

- Added validated local persistence and full URL scenario encoding; malformed or partial data is ignored safely.
- Added a share action that copies the complete scenario URL, with a browser-address fallback when clipboard permission is unavailable.
- Added Playwright production-build tests for desktop and mobile: initial run, parameter update and reload, invalid input blocking, shared-link hydration, and console errors.
- Reduced the initial default from 10,000 to 2,000 paths after browser timing showed the larger default delayed first results; the user-selectable maximum remains 100,000.
- Added `check:release` and CI browser-report artifacts. Repeated browser verification is now one deterministic command rather than an LLM-driven manual pass.

## 2026-08-12 — Independent review remediation

- Fixed stale-result labeling: CVaR percentage now comes from the immutable `result.params` snapshot.
- Normalized all chart values and axis labels by the simulation's initial investment before presenting them as multiples.
- Scoped Pages and OIDC write permissions to the deploy job only; dependency installation and build retain read-only permissions.
- Made browser storage fully optional by catching localStorage acquisition, read, serialization and write failures.
- Added regression tests for chart units and blocked storage; the release gate passes after all four findings.

## 2026-08-12 — Final blocker remediation

- Centralized leverage color selection so integer and decimal leverage values use valid, consistent colors across metric cards and both charts.
- Added regression coverage for 2.5× and out-of-range color indexing.
- Changed the Pages build job to install Chromium and run `check:release`, so deployment cannot proceed when browser tests fail.
- Re-ran the complete release gate: 34/34 unit and component tests, production build, and 6/6 desktop/mobile browser scenarios passed.

## 2026-08-13 — Privacy-first usage analytics

- Owner approved Cloudflare Web Analytics for aggregate usage monitoring.
- Added the Cloudflare beacon to the production HTML using the owner-provided public site token.
- Added a concise Hebrew disclosure: aggregate usage data, no cookies, and no visitor profiling.
- TDD evidence: the targeted desktop E2E test failed before the beacon/disclosure existed, then passed after implementation.
- Scope is page-level traffic and performance analytics only; no simulation parameters, financial inputs, custom events, accounts, or personal profiles are collected by application code.

## 2026-08-26 — Prominent calculation status

- The upper-left calculation-status icon now becomes visibly red, with a red-tinted pill, while the simulation is running ("מחשב · x%").
- When the Web Worker completes, it returns to the existing green ready state ("המודל מוכן").
- TDD evidence: targeted desktop browser test was observed failing because the running-status class was absent; implementation added it and the red styling.

## 2026-08-26 — Brand rename

- Renamed the public product name from "מסלול" to "מבחן המינוף" in the in-app heading, browser title, and README.
- Added desktop and mobile browser coverage that verifies both the visible H1 and the document title.
- TDD evidence: the new browser test failed against the former name, then passed after the rename.

## 2026-08-26 — Positive-tail average

- Added a user-editable positive-tail percentage (1%–25%, default 5%), independent of the existing CVaR percentage.
- The simulator now calculates the average final value among the selected X% best paths and shows it beside CVaR as “ממוצע זנב חיובי”.
- Added Hebrew descriptions in the control, parameter glossary, and mathematical-model documentation; URL sharing and local persistence include the new parameter.
- TDD evidence: targeted statistics, engine, validation, storage, and browser tests were first observed failing, then passed after implementation.

## 2026-08-26 — Black-swan stress calibration

- Updated the `S&P היסטורי` preset to use tail degrees of freedom `4.2`, an intentionally stress-oriented setting for examining leveraged-fund fragility rather than a neutral normal-market assumption.
- Added a concise in-product explanation of black swans, their potential market impact, and the link between lower Student-t degrees of freedom and more frequent extreme daily moves.
- TDD evidence: the new desktop/mobile browser test first failed because the preset remained at `5`; after the implementation and production build it passed in both browsers.
- Follow-up: the glossary now names these events explicitly as “ברבורים שחורים”; the browser test verifies the visible wording.
- Visibility fix: the same wording is now displayed directly below the `עובי הזנבות` input, without requiring the glossary to be expanded.

## 2026-08-26 — Codex project handoff foundation

- Established GitHub as the durable source of truth for product, model, sources, decisions, operations, and current status.
- Added accepted ADRs for the natural zero floor, editable inputs, browser-only worker architecture, black-swan stress preset, positive-tail metric, and privacy-first analytics.
- Added a reproducible FRED calibration script plus deterministic unit tests for CSV parsing, simple returns, sample excess kurtosis, and Student-t fitting.
- Added GitHub Issue and PR templates with acceptance criteria and owner-approval classification.
- Added Codex bootstrap and routine-task prompts; private profile details and raw session identifiers remain outside the public repository.
- TDD evidence: the tail-calibration test first failed because the module did not exist, then the parsing/return/kurtosis tests failed because their functions were missing; all passed after the minimal implementations.
- Release evidence: `npm run check:release` passed with 45 unit/component tests and 18 desktop/mobile Playwright tests; the production artifact commit marker matched Git HEAD; the dated FRED reproduction returned excess kurtosis `15.833504835144865` and fitted `df = 4.378943263823818`.
- Codex read-only audit found and triggered fixes for CVaR wording, compatibility and approval ambiguity, missing methodological provenance, ADR evidence links, a committed calibration result, and deterministic commit-aware live-site verification.
- Pre-marker live evidence confirmed HTTP 200, the expected product title, and non-empty production JavaScript/CSS assets; the commit-aware live gate is verified after deployment.

## 2026-08-30 — Soft limit for simulation paths

- Limited the standard paths slider to 10,000 while preserving manual input, shared URLs and saved browser parameters up to the existing validated maximum of 100,000.
- Values above 10,000 keep their exact numeric value, pin the slider thumb to its upper end and show an accessible warning that heavier runs are mainly useful for rare-event analysis.
- The simulation engine, default path count, parameter schema and validation limits remain unchanged.
- TDD evidence: the targeted component test first failed because the advisory was absent, then passed after separate numeric-input and slider bounds were implemented.

## 2026-08-31 — Statistical reliability disclosure

- Preserved the approved return model, `df` range `2.01–100`, path range `100–100,000`, default of 2,000 paths, PRNG, presets and saved/shared parameter schema.
- Added non-blocking convergence warnings: strong below `df = 3` and moderate for `3 ≤ df ≤ 4`.
- Added the actual tail observation count to CVaR and the positive-tail average, with strong warnings below 30 observations and moderate warnings for 30–99.
- Added wipeout counts and an analytic Wilson 95% interval, with strong rare-event warnings below 25 observed wipeouts and moderate warnings for 25–99.
- TDD evidence: the reliability unit suite first failed because the module did not exist, then passed 6/6; the component test first failed because the strong advisory class was missing, then passed 6/6; the new desktop/mobile browser scenarios first failed because the `df` advisory was absent, then passed 4/4.
- The deterministic research script and committed report separate the heavy-tail model limitation near `df = 2` from finite-sample Monte Carlo noise and quantify rare-event uncertainty in the built-in scenarios.
