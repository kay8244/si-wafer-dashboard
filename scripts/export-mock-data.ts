/**
 * Export MI Platform mock data as JSON for Graphiti ingestion.
 *
 * Usage: npx tsx scripts/export-mock-data.ts
 * Output: ../04_Graphiti/mi-knowledge-graph/export-data/*.json
 */
import * as fs from 'fs';
import * as path from 'path';

import { CUSTOMER_LIST, CUSTOMER_EXECUTIVES } from '../tests/fixtures/customer-detail-mock';
import { SUPPLY_CHAIN_CATEGORIES, INTERNAL_COMPANY_DATA, FOUNDRY_NODES } from '../tests/fixtures/supply-chain-mock';
import {
  VCM_DATA,
  APP_YEARLY_DEMANDS,
  DEVICE_STACKED_YEARLY,
  DEVICE_STACKED_YEARLY_BY_APP,
  TOTAL_WAFER_YEARLY,
  MOUNT_PER_UNIT_BY_CATEGORY,
  YEARLY_MOUNT_PER_UNIT_BY_CATEGORY,
  VCM_VERSIONS,
} from '../tests/fixtures/vcm-mock';

const OUTPUT_DIR = path.resolve(__dirname, '../../04_Graphiti/mi-knowledge-graph/export-data');

function writeJSON(filename: string, data: unknown) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Exported: ${filepath}`);
}

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 1. Customer data
writeJSON('customer-list.json', CUSTOMER_LIST);
writeJSON('customer-executives.json', CUSTOMER_EXECUTIVES);

// 2. Supply chain data
writeJSON('supply-chain-categories.json', SUPPLY_CHAIN_CATEGORIES);
writeJSON('internal-company-data.json', INTERNAL_COMPANY_DATA);
writeJSON('foundry-nodes.json', FOUNDRY_NODES);

// 3. VCM data
writeJSON('vcm-data.json', VCM_DATA);
writeJSON('app-yearly-demands.json', APP_YEARLY_DEMANDS);
writeJSON('device-stacked-yearly.json', DEVICE_STACKED_YEARLY);
writeJSON('device-stacked-yearly-by-app.json', DEVICE_STACKED_YEARLY_BY_APP);
writeJSON('total-wafer-yearly.json', TOTAL_WAFER_YEARLY);
writeJSON('mount-per-unit.json', MOUNT_PER_UNIT_BY_CATEGORY);
writeJSON('yearly-mount-per-unit.json', YEARLY_MOUNT_PER_UNIT_BY_CATEGORY);
writeJSON('vcm-versions.json', VCM_VERSIONS);

console.log('\nAll mock data exported successfully!');
