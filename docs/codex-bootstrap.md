# הפעלת Codex בפרויקט

## ביקורת העברה חד־פעמית

לאחר מיזוג חבילת התיעוד, פתח משימת Codex חדשה והדבק:

```text
Work in the connected repository dani1565/Monte-Carlo-simulator.

Before changing anything, read AGENTS.md, README.md, docs/product-spec.md, docs/model.md, docs/sources.md, docs/operations.md, docs/status.md, and every accepted ADR under docs/decisions/.

This first task is a read-only handoff audit. Do not edit files, commit, open a PR, merge, or deploy.

Report in Hebrew:
1. The product purpose and target user.
2. Every hard product invariant.
3. The current mathematical model and known limitations.
4. Why df=4.2 is a stress choice and not an exact historical claim.
5. Which changes require owner approval.
6. The exact TDD, test, PR, CI, merge, deployment, and live-verification workflow.
7. Contradictions, stale statements, missing sources, or ambiguous rules, with exact file references.

Be concise. End with the inspected commit and the commands for a normal task.
```

אם Codex מפספס ידע קבוע, מתקנים את מסמכי הפרויקט במקום להגדיל לצמיתות את הפרומפט.

## פרומפט משימה רגיל

```text
Implement GitHub Issue #<N> in dani1565/Monte-Carlo-simulator.
Read and follow AGENTS.md and the linked product/model/ADR documentation.
Work autonomously through branch, strict TDD, implementation, full release gate, PR, review fixes, CI, merge, Pages verification, and live-site verification, unless the Issue is classified as owner-approval-required.
Do not change scope or model assumptions beyond the Issue.
If a material product/model/privacy/legal decision is needed, stop and ask one precise question in Hebrew.
Return a concise Hebrew summary with commit, PR, tests, CI, merge, deployment, and live verification.
```

ה־Issue מחזיק את הדרישות וה־acceptance criteria. אין להדביק בכל משימה את כל היסטוריית הפרויקט.
