---
phase: 2
slug: core-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | QUAL-01 | unit | `npx vitest run tests/hooks/useAiInsight.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | QUAL-02 | unit | `npx vitest run tests/components/AiInsightPanel.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | QUAL-07 | grep | `grep -r "eslint-disable.*exhaustive-deps" src/ \| wc -l` → 0 | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | QUAL-03 | integration | `npx vitest run tests/api/validation.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | QUAL-04 | grep | `grep -rn "catch.*{}" src/ \| wc -l` → 0 | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | QUAL-05 | integration | `npx vitest run tests/api/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | QUAL-06 | integration | `npx vitest run tests/api/auth.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hooks/useAiInsight.test.ts` — stubs for QUAL-01, QUAL-02
- [ ] `tests/components/AiInsightPanel.test.ts` — stubs for QUAL-02
- [ ] `tests/api/validation.test.ts` — stubs for QUAL-03 Zod validation
- [ ] `tests/api/rate-limit.test.ts` — stubs for QUAL-05
- [ ] `tests/api/auth.test.ts` — stubs for QUAL-06

*Vitest already installed and configured. No framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser auth dialog appears | QUAL-06 | Browser-specific UI | Open dashboard in browser, verify Basic Auth prompt appears |
| Rate limit 429 in browser | QUAL-05 | Requires rapid manual clicks | Open Network tab, trigger 11+ AI insight requests within 1 minute |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
