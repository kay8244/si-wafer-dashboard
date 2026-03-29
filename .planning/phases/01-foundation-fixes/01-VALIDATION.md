---
phase: 1
slug: foundation-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (mandatory per CLAUDE.md)
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUN-01 | unit | `npx vitest run src/lib/__tests__/db.test.ts -t "singleton"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUN-02 | manual | Trigger error in dev, visually verify | N/A | ⬜ pending |
| 1-03-01 | 03 | 1 | FOUN-03 | unit | `npx vitest run src/components/__tests__/ChartErrorBoundary.test.tsx -t "error"` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 1 | FOUN-04 | smoke | `node -e "const p=require('./package.json');if(p.scripts.postinstall)process.exit(1)"` | ❌ inline | ⬜ pending |
| 1-05-01 | 05 | 1 | FOUN-05 | smoke | `npx vitest run` (build succeeds, no src/data/*-mock.ts) | ❌ build | ⬜ pending |
| 1-06-01 | 06 | 1 | FOUN-06 | smoke | `node -e "const p=require('./package.json');if(p.dependencies['@types/node'])process.exit(1)"` | ❌ inline | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/db.test.ts` — stubs for FOUN-01 singleton behavior
- [ ] `src/components/__tests__/ChartErrorBoundary.test.tsx` — stubs for FOUN-03 error catching

*Existing infrastructure covers remaining phase requirements via inline smoke checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| error.tsx and global-error.tsx render correctly | FOUN-02 | Visual UI verification needed | 1. Trigger a runtime error in a page component 2. Verify error boundary UI appears (not white screen) 3. Verify reset button works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
