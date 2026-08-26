# Project instructions

## Read first

Before changing behavior, read the relevant repository contracts:

1. `docs/product-spec.md` — product purpose and UX invariants.
2. `docs/model.md` — mathematical definitions and limits.
3. `docs/sources.md` — research provenance and reproducible calibration.
4. `docs/decisions/README.md` — accepted architectural/product decisions.
5. `docs/operations.md` — issue, TDD, PR, CI, merge, deploy, and rollback workflow.
6. `docs/status.md` — short current-state snapshot.

Current code and executable tests are authoritative for current behavior. Accepted ADRs are authoritative for rationale. The implementation log is historical evidence, not the current task queue.

## Product invariants

- “מבחן המינוף” is a Hebrew RTL Monte Carlo simulator for studying leveraged investing, especially the effect of fat tails and black-swan events.
- Every simulation input must remain user-editable.
- Do not implement an artificial ruin threshold. Portfolio value has a natural floor of zero only.
- Explanations requested for an input must be visible beside that field, not only inside a collapsed glossary.
- Computation stays in the browser and runs in a Web Worker.
- Preserve backward compatibility for valid shared URLs and saved browser parameters when adding fields.
- The product is educational/research-oriented, not investment advice.
- Keep the existing concise Israeli-market disclaimer style unless the owner approves a legal-scope change.

## Engineering rules

- Use strict TDD for behavior changes: targeted failing test, minimal implementation, targeted pass, then full gate.
- Keep mathematical and statistical logic separate from React components.
- Prefer deterministic scripts over LLM work for repeatable checks.
- Verify user-visible changes on desktop and mobile; explanatory visibility is product behavior.
- Do not add taxes, fees, financing costs, live/historical data pipelines, accounts, storage, new analytics, cookies, tracking, paid services, or secrets without owner approval.
- A formula, random process, model assumption, preset meaning, metric definition, privacy, analytics, legal, infrastructure, or hard-invariant change requires owner approval before implementation starts. Reconfirm that approval still covers the final scope before merge; if a material need appears mid-task, stop before making that change.
- Routine bug fixes, tests, refactors, documentation, accessibility, and responsive UI work within the approved contracts may proceed autonomously.

## Canonical commands

- Fast gate: `npm run check:fast`
- Full gate: `npm run check:full`
- Release gate: `npm run check:release`
- Production build: `npm run build`
- Reproduce the dated S&P 500 tail calibration: `npm run calibrate:sp500-tail`

Never bypass or fake a gate. Never push unreviewed work directly to `main`. Never merge or deploy unless the release-relevant local gate and required GitHub checks pass.

## GitHub workflow and reporting

- Work from one bounded GitHub Issue on a task branch and open a PR.
- Classify the PR as either `owner approval required: no` or explain the required approval.
- Use squash merge after required checks and approvals pass.
- After merge, inspect the post-merge Actions and verify the public Pages site when user-visible output may change.
- Report in concise Hebrew: branch/commit, PR URL, targeted and release test results, CI, merge, deployment, and live verification.
- If manual owner action is required, ask one precise question or give one short action at a time.
- Never commit secrets, personal profile details, email/session identifiers, or raw private conversations.
