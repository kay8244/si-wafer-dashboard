/**
 * 데이터 적재 검증 스크립트
 * Usage: npx tsx scripts/validate.ts
 *
 * 현황판에 필요한 모든 데이터가 정상 적재되었는지 자동 검증합니다.
 */

import { getDb } from '../src/lib/db';

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, status: 'PASS' | 'WARN' | 'FAIL', message: string) {
  results.push({ name, status, message });
}

function main() {
  const db = getDb();

  // ── 1. 전체 행 수 ─────────────────────────────────────────────────────────
  const totalRows = (db.prepare('SELECT COUNT(*) as cnt FROM metrics').get() as { cnt: number }).cnt;
  if (totalRows === 0) {
    check('전체 데이터', 'FAIL', 'metrics 테이블이 비어있습니다. npm run seed를 실행하세요.');
    printResults();
    return;
  }
  check('전체 데이터', 'PASS', `총 ${totalRows.toLocaleString()}행`);

  // ── 2. 탭별 행 수 ─────────────────────────────────────────────────────────
  const tabCounts = db.prepare('SELECT tab, COUNT(*) as cnt FROM metrics GROUP BY tab').all() as { tab: string; cnt: number }[];
  const tabMap = Object.fromEntries(tabCounts.map((t) => [t.tab, t.cnt]));

  for (const tab of ['supply-chain', 'vcm', 'customer-detail']) {
    const cnt = tabMap[tab] ?? 0;
    if (cnt === 0) {
      check(`탭: ${tab}`, 'FAIL', '데이터 없음');
    } else {
      check(`탭: ${tab}`, 'PASS', `${cnt.toLocaleString()}행`);
    }
  }

  // ── 3. 전방시장 필수 데이터 ────────────────────────────────────────────────
  const indicatorMetaCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='indicatorMeta'").get() as { cnt: number }).cnt;
  if (indicatorMetaCount === 0) {
    check('전방시장: 지표 메타데이터', 'FAIL', 'indicatorMeta 없음 — 테이블이 비어 보입니다');
  } else {
    check('전방시장: 지표 메타데이터', 'PASS', `${indicatorMetaCount}개 지표`);
  }

  const actualCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='actual'").get() as { cnt: number }).cnt;
  if (actualCount === 0) {
    check('전방시장: 시계열 데이터', 'FAIL', 'actual 데이터 없음');
  } else {
    check('전방시장: 시계열 데이터', 'PASS', `actual ${actualCount}행`);
  }

  // ── 4. 내부 데이터 (CAPA/투입량/가동률) ──────────────────────────────────
  const internalCompanies = ['SEC', 'SK Hynix', 'Micron', 'TSMC', 'SMIC', 'GFs'];
  for (const company of internalCompanies) {
    const capaCnt = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='internal_capa' AND customer=?").get(company) as { cnt: number }).cnt;
    const inputCnt = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='internal_waferInput' AND customer=?").get(company) as { cnt: number }).cnt;

    if (capaCnt === 0 || inputCnt === 0) {
      check(`내부데이터: ${company}`, 'FAIL', `capa=${capaCnt}행, waferInput=${inputCnt}행`);
    } else {
      // 투입량이 CAPA 수준인지 확인 (최근 값)
      const lastCapa = db.prepare("SELECT value FROM metrics WHERE tab='supply-chain' AND category='internal_capa' AND customer=? ORDER BY date DESC LIMIT 1").get(company) as { value: number } | undefined;
      const lastInput = db.prepare("SELECT value FROM metrics WHERE tab='supply-chain' AND category='internal_waferInput' AND customer=? ORDER BY date DESC LIMIT 1").get(company) as { value: number } | undefined;

      if (lastCapa && lastInput) {
        const ratio = lastInput.value / lastCapa.value;
        if (ratio < 0.3 || ratio > 1.2) {
          check(`내부데이터: ${company}`, 'WARN', `투입량/CAPA 비율 ${(ratio * 100).toFixed(0)}% — 비정상 (50~100% 예상). capa=${lastCapa.value}, waferInput=${lastInput.value}`);
        } else {
          check(`내부데이터: ${company}`, 'PASS', `${capaCnt}개월, 가동률 약 ${(ratio * 100).toFixed(0)}%`);
        }
      } else {
        check(`내부데이터: ${company}`, 'PASS', `capa=${capaCnt}행, waferInput=${inputCnt}행`);
      }
    }
  }

  // ── 5. Foundry 노드 ────────────────────────────────────────────────────────
  const foundryNodeCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='foundry_node'").get() as { cnt: number }).cnt;
  if (foundryNodeCount === 0) {
    check('Foundry 노드', 'FAIL', '데이터 없음 — 파운드리 고객 가동률 차트가 비어 보입니다');
  } else {
    const nodeCompanies = db.prepare("SELECT DISTINCT version FROM metrics WHERE tab='supply-chain' AND category='foundry_node'").all() as { version: string }[];
    check('Foundry 노드', 'PASS', `${foundryNodeCount}행 (${nodeCompanies.map((n) => n.version).join(', ')})`);
  }

  // ── 6. Server 선행지표 ─────────────────────────────────────────────────────
  const serverCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='server_indicator'").get() as { cnt: number }).cnt;
  if (serverCount === 0) {
    check('Server 선행지표', 'FAIL', '데이터 없음 — Server 선행지표 탭이 비어 보입니다');
  } else {
    const serverIndicators = (db.prepare("SELECT COUNT(DISTINCT customer) as cnt FROM metrics WHERE tab='supply-chain' AND category='server_indicator'").get() as { cnt: number }).cnt;
    check('Server 선행지표', 'PASS', `${serverCount}행 (${serverIndicators}개 지표)`);
  }

  // ── 7. Memory Price ────────────────────────────────────────────────────────
  const memoryCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='memory_price'").get() as { cnt: number }).cnt;
  if (memoryCount === 0) {
    check('Memory Price', 'FAIL', '데이터 없음 — Memory Price 탭이 비어 보입니다');
  } else {
    const memoryIndicators = (db.prepare("SELECT COUNT(DISTINCT customer) as cnt FROM metrics WHERE tab='supply-chain' AND category='memory_price'").get() as { cnt: number }).cnt;
    check('Memory Price', 'PASS', `${memoryCount}행 (${memoryIndicators}개 지표)`);
  }

  // ── 8. 고객 목록 ───────────────────────────────────────────────────────────
  const customerListCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='customer-detail' AND category='customerList'").get() as { cnt: number }).cnt;
  if (customerListCount === 0) {
    check('고객 목록', 'FAIL', 'customerList 없음 — 고객 탭이 비어 보입니다');
  } else {
    check('고객 목록', 'PASS', `${customerListCount}개 고객`);
  }

  // ── 9. 고객별 월별 메트릭 ──────────────────────────────────────────────────
  const monthlyCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='customer-detail' AND category LIKE 'monthly_%'").get() as { cnt: number }).cnt;
  if (monthlyCount === 0) {
    check('고객별 월별 메트릭', 'FAIL', '데이터 없음');
  } else {
    const monthlyCustomers = (db.prepare("SELECT COUNT(DISTINCT customer) as cnt FROM metrics WHERE tab='customer-detail' AND category LIKE 'monthly_%'").get() as { cnt: number }).cnt;
    check('고객별 월별 메트릭', 'PASS', `${monthlyCount}행 (${monthlyCustomers}개 고객)`);
  }

  // ── 10. VCM ────────────────────────────────────────────────────────────────
  const vcmCount = tabMap['vcm'] ?? 0;
  if (vcmCount === 0) {
    check('VCM 수요예측', 'WARN', '데이터 없음 — VCM 탭이 비어 보입니다 (다른 탭에 영향 없음)');
  } else {
    check('VCM 수요예측', 'PASS', `${vcmCount}행`);
  }

  // ── 11. 오버레이 색상 ──────────────────────────────────────────────────────
  const colorCount = (db.prepare("SELECT COUNT(*) as cnt FROM metrics WHERE tab='supply-chain' AND category='overlayColor'").get() as { cnt: number }).cnt;
  if (colorCount === 0) {
    check('오버레이 색상', 'WARN', '없음 — 기본 회색으로 표시됩니다');
  } else {
    check('오버레이 색상', 'PASS', `${colorCount}개 회사`);
  }

  printResults();
}

function printResults() {
  console.log('\n========================================');
  console.log('  데이터 적재 검증 결과');
  console.log('========================================\n');

  const icons = { PASS: '\x1b[32m✓\x1b[0m', WARN: '\x1b[33m⚠\x1b[0m', FAIL: '\x1b[31m✗\x1b[0m' };
  let passCount = 0, warnCount = 0, failCount = 0;

  for (const r of results) {
    console.log(`  ${icons[r.status]} ${r.name}: ${r.message}`);
    if (r.status === 'PASS') passCount++;
    else if (r.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('\n----------------------------------------');
  console.log(`  결과: \x1b[32m${passCount} PASS\x1b[0m / \x1b[33m${warnCount} WARN\x1b[0m / \x1b[31m${failCount} FAIL\x1b[0m`);

  if (failCount > 0) {
    console.log('\n  \x1b[31mFAIL 항목이 있습니다. 위 메시지를 확인하고 데이터를 적재하세요.\x1b[0m');
  } else if (warnCount > 0) {
    console.log('\n  \x1b[33m경고 항목이 있지만 현황판은 정상 동작합니다.\x1b[0m');
  } else {
    console.log('\n  \x1b[32m모든 데이터가 정상 적재되었습니다!\x1b[0m');
  }
  console.log('');
}

main();
