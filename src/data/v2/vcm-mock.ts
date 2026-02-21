import type { VcmData, VcmVersion, ApplicationDemand, ApplicationType, DeviceType, DeviceWaferDemand, MountPerUnit, TotalWaferDemand, VcmNews } from '@/types/v2';

export const VCM_VERSIONS: VcmVersion[] = [
  { id: 'V75.04', label: 'V75.04 (2024.2H 전망)', date: '2024-07-15' },
  { id: 'V74.10', label: 'V74.10 (2024.1H 실적)', date: '2024-04-10' },
  { id: 'V73.08', label: 'V73.08 (2023.2H 전망)', date: '2023-12-20' },
];

const APPLICATION_DEMANDS: Record<ApplicationType, ApplicationDemand> = {
  traditionalServer: {
    application: 'traditionalServer',
    label: 'Traditional Server',
    yearly: [
      { year: 2019, value: 1120000, isEstimate: false },
      { year: 2020, value: 1180000, isEstimate: false },
      { year: 2021, value: 1350000, isEstimate: false },
      { year: 2022, value: 1280000, isEstimate: false },
      { year: 2023, value: 1310000, isEstimate: false },
      { year: 2024, value: 1380000, isEstimate: false },
      { year: 2025, value: 1450000, isEstimate: true },
      { year: 2026, value: 1520000, isEstimate: true },
    ],
  },
  aiServer: {
    application: 'aiServer',
    label: 'AI/Highpower Server',
    yearly: [
      { year: 2019, value: 45000, isEstimate: false },
      { year: 2020, value: 68000, isEstimate: false },
      { year: 2021, value: 120000, isEstimate: false },
      { year: 2022, value: 210000, isEstimate: false },
      { year: 2023, value: 380000, isEstimate: false },
      { year: 2024, value: 620000, isEstimate: false },
      { year: 2025, value: 950000, isEstimate: true },
      { year: 2026, value: 1350000, isEstimate: true },
    ],
  },
  smartphone: {
    application: 'smartphone',
    label: 'Smartphone',
    yearly: [
      { year: 2019, value: 1370000, isEstimate: false },
      { year: 2020, value: 1240000, isEstimate: false },
      { year: 2021, value: 1350000, isEstimate: false },
      { year: 2022, value: 1210000, isEstimate: false },
      { year: 2023, value: 1170000, isEstimate: false },
      { year: 2024, value: 1230000, isEstimate: false },
      { year: 2025, value: 1280000, isEstimate: true },
      { year: 2026, value: 1310000, isEstimate: true },
    ],
  },
  pcNotebook: {
    application: 'pcNotebook',
    label: 'PC/Notebook',
    yearly: [
      { year: 2019, value: 261000, isEstimate: false },
      { year: 2020, value: 302000, isEstimate: false },
      { year: 2021, value: 340000, isEstimate: false },
      { year: 2022, value: 290000, isEstimate: false },
      { year: 2023, value: 260000, isEstimate: false },
      { year: 2024, value: 272000, isEstimate: false },
      { year: 2025, value: 285000, isEstimate: true },
      { year: 2026, value: 295000, isEstimate: true },
    ],
  },
  electricVehicle: {
    application: 'electricVehicle',
    label: 'Electric Vehicle',
    yearly: [
      { year: 2019, value: 2100, isEstimate: false },
      { year: 2020, value: 3100, isEstimate: false },
      { year: 2021, value: 6600, isEstimate: false },
      { year: 2022, value: 10200, isEstimate: false },
      { year: 2023, value: 13800, isEstimate: false },
      { year: 2024, value: 16500, isEstimate: false },
      { year: 2025, value: 20000, isEstimate: true },
      { year: 2026, value: 24500, isEstimate: true },
    ],
  },
  ioe: {
    application: 'ioe',
    label: 'IoE',
    yearly: [
      { year: 2019, value: 82000, isEstimate: false },
      { year: 2020, value: 95000, isEstimate: false },
      { year: 2021, value: 112000, isEstimate: false },
      { year: 2022, value: 128000, isEstimate: false },
      { year: 2023, value: 142000, isEstimate: false },
      { year: 2024, value: 158000, isEstimate: false },
      { year: 2025, value: 175000, isEstimate: true },
      { year: 2026, value: 195000, isEstimate: true },
    ],
  },
  automotive: {
    application: 'automotive',
    label: 'Automotive',
    yearly: [
      { year: 2019, value: 88000, isEstimate: false },
      { year: 2020, value: 76000, isEstimate: false },
      { year: 2021, value: 82000, isEstimate: false },
      { year: 2022, value: 95000, isEstimate: false },
      { year: 2023, value: 102000, isEstimate: false },
      { year: 2024, value: 112000, isEstimate: false },
      { year: 2025, value: 125000, isEstimate: true },
      { year: 2026, value: 138000, isEstimate: true },
    ],
  },
};

const DEVICE_WAFER_DEMANDS: Record<DeviceType, DeviceWaferDemand> = {
  dram: {
    device: 'dram',
    label: 'DRAM',
    yearly: [
      { year: 2019, waferDemand: 1420, isEstimate: false },
      { year: 2020, waferDemand: 1380, isEstimate: false },
      { year: 2021, waferDemand: 1510, isEstimate: false },
      { year: 2022, waferDemand: 1350, isEstimate: false },
      { year: 2023, waferDemand: 1280, isEstimate: false },
      { year: 2024, waferDemand: 1450, isEstimate: false },
      { year: 2025, waferDemand: 1580, isEstimate: true },
      { year: 2026, waferDemand: 1700, isEstimate: true },
    ],
  },
  hbm: {
    device: 'hbm',
    label: 'HBM',
    yearly: [
      { year: 2019, waferDemand: 20, isEstimate: false },
      { year: 2020, waferDemand: 35, isEstimate: false },
      { year: 2021, waferDemand: 55, isEstimate: false },
      { year: 2022, waferDemand: 85, isEstimate: false },
      { year: 2023, waferDemand: 150, isEstimate: false },
      { year: 2024, waferDemand: 280, isEstimate: false },
      { year: 2025, waferDemand: 450, isEstimate: true },
      { year: 2026, waferDemand: 680, isEstimate: true },
    ],
  },
  nand: {
    device: 'nand',
    label: 'NAND',
    yearly: [
      { year: 2019, waferDemand: 1650, isEstimate: false },
      { year: 2020, waferDemand: 1720, isEstimate: false },
      { year: 2021, waferDemand: 1850, isEstimate: false },
      { year: 2022, waferDemand: 1680, isEstimate: false },
      { year: 2023, waferDemand: 1550, isEstimate: false },
      { year: 2024, waferDemand: 1620, isEstimate: false },
      { year: 2025, waferDemand: 1750, isEstimate: true },
      { year: 2026, waferDemand: 1880, isEstimate: true },
    ],
  },
  foundry: {
    device: 'foundry',
    label: 'Foundry',
    yearly: [
      { year: 2019, waferDemand: 2800, isEstimate: false },
      { year: 2020, waferDemand: 3100, isEstimate: false },
      { year: 2021, waferDemand: 3500, isEstimate: false },
      { year: 2022, waferDemand: 3200, isEstimate: false },
      { year: 2023, waferDemand: 3050, isEstimate: false },
      { year: 2024, waferDemand: 3400, isEstimate: false },
      { year: 2025, waferDemand: 3700, isEstimate: true },
      { year: 2026, waferDemand: 4000, isEstimate: true },
    ],
  },
  discrete: {
    device: 'discrete',
    label: 'Discrete',
    yearly: [
      { year: 2019, waferDemand: 580, isEstimate: false },
      { year: 2020, waferDemand: 610, isEstimate: false },
      { year: 2021, waferDemand: 650, isEstimate: false },
      { year: 2022, waferDemand: 680, isEstimate: false },
      { year: 2023, waferDemand: 700, isEstimate: false },
      { year: 2024, waferDemand: 730, isEstimate: false },
      { year: 2025, waferDemand: 760, isEstimate: true },
      { year: 2026, waferDemand: 800, isEstimate: true },
    ],
  },
};

const MOUNT_PER_UNIT: MountPerUnit[] = [
  {
    serverType: 'traditional',
    label: 'Traditional Server',
    metrics: [
      { year: 2023, value: 1.71, unit: 'GB/unit' },
      { year: 2024, value: 2.10, unit: 'GB/unit' },
      { year: 2025, value: 3.10, unit: 'GB/unit' },
      { year: 2026, value: 4.20, unit: 'GB/unit' },
    ],
  },
  {
    serverType: 'ai',
    label: 'AI Server',
    metrics: [
      { year: 2023, value: 7.9, unit: 'TB/unit' },
      { year: 2024, value: 11.2, unit: 'TB/unit' },
      { year: 2025, value: 14.8, unit: 'TB/unit' },
      { year: 2026, value: 19.5, unit: 'TB/unit' },
    ],
  },
];

const TOTAL_WAFER_DEMAND: TotalWaferDemand[] = [
  { year: 2019, total: 6470, isEstimate: false },
  { year: 2020, total: 6845, isEstimate: false },
  { year: 2021, total: 7565, isEstimate: false },
  { year: 2022, total: 6995, isEstimate: false },
  { year: 2023, total: 6730, isEstimate: false },
  { year: 2024, total: 7480, isEstimate: false },
  { year: 2025, total: 8240, isEstimate: true },
  { year: 2026, total: 9060, isEstimate: true },
];

const VCM_NEWS: VcmNews[] = [
  { source: 'Gartner', date: '1/6', title: '2025 AI 서버 시장 성장률 조정치 발표, 전년 대비 58% 성장 전망', summary: 'AI 인프라 투자 지속' },
  { source: 'Digitimes', date: '1/20', title: 'SK하이닉스 HBM4 Qual 완료 시점 4분기 전망 발표', summary: 'HBM4 양산 일정' },
  { source: 'TrendForce', date: '1/15', title: 'DRAM 계약가 1Q25 +3~5% 상승 전망, 서버향 수요 견인', summary: '서버 DRAM 가격 상승' },
  { source: 'IDC', date: '1/22', title: '2025 글로벌 서버 출하량 전년 대비 4.2% 증가 전망', summary: '서버 출하 성장 지속' },
  { source: 'Omdia', date: '1/18', title: 'AI 가속기 시장 2026년 $120B 규모 전망', summary: 'AI 가속기 시장 확대' },
];

const APPLICATION_TABLE = [
  {
    application: 'Traditional Server',
    yearly: [
      { year: 2023, value: 78120, isEstimate: false },
      { year: 2024, value: 82400, isEstimate: false },
      { year: 2025, value: 86100, isEstimate: true },
      { year: 2026, value: 89500, isEstimate: true },
    ],
  },
  {
    application: 'AI Server',
    yearly: [
      { year: 2023, value: 38200, isEstimate: false },
      { year: 2024, value: 62100, isEstimate: false },
      { year: 2025, value: 95800, isEstimate: true },
      { year: 2026, value: 136000, isEstimate: true },
    ],
  },
  {
    application: 'Smartphone',
    yearly: [
      { year: 2023, value: 1174000, isEstimate: false },
      { year: 2024, value: 1236000, isEstimate: false },
      { year: 2025, value: 1284000, isEstimate: true },
      { year: 2026, value: 1312000, isEstimate: true },
    ],
  },
  {
    application: 'PC/Notebook',
    yearly: [
      { year: 2023, value: 261000, isEstimate: false },
      { year: 2024, value: 272000, isEstimate: false },
      { year: 2025, value: 285000, isEstimate: true },
      { year: 2026, value: 295000, isEstimate: true },
    ],
  },
];

// Per-application mount data
const MOUNT_PER_UNIT_BY_APP: Record<ApplicationType, MountPerUnit[]> = {
  traditionalServer: [
    { serverType: 'traditional', label: 'Traditional Server', metrics: [{ year: 2023, value: 1.71, unit: 'GB/unit' }, { year: 2024, value: 2.10, unit: 'GB/unit' }, { year: 2025, value: 3.10, unit: 'GB/unit' }, { year: 2026, value: 4.20, unit: 'GB/unit' }] },
    { serverType: 'ai', label: 'AI Server', metrics: [{ year: 2023, value: 7.9, unit: 'TB/unit' }, { year: 2024, value: 11.2, unit: 'TB/unit' }, { year: 2025, value: 14.8, unit: 'TB/unit' }, { year: 2026, value: 19.5, unit: 'TB/unit' }] },
  ],
  aiServer: [
    { serverType: 'traditional', label: 'Traditional Server', metrics: [{ year: 2023, value: 1.71, unit: 'GB/unit' }, { year: 2024, value: 2.10, unit: 'GB/unit' }, { year: 2025, value: 3.10, unit: 'GB/unit' }, { year: 2026, value: 4.20, unit: 'GB/unit' }] },
    { serverType: 'ai', label: 'AI Server', metrics: [{ year: 2023, value: 7.9, unit: 'TB/unit' }, { year: 2024, value: 11.2, unit: 'TB/unit' }, { year: 2025, value: 14.8, unit: 'TB/unit' }, { year: 2026, value: 19.5, unit: 'TB/unit' }] },
  ],
  smartphone: [
    { serverType: 'traditional', label: 'Flagship', metrics: [{ year: 2023, value: 12, unit: 'GB' }, { year: 2024, value: 12, unit: 'GB' }, { year: 2025, value: 16, unit: 'GB' }, { year: 2026, value: 16, unit: 'GB' }] },
    { serverType: 'ai', label: 'Mid-range', metrics: [{ year: 2023, value: 8, unit: 'GB' }, { year: 2024, value: 8, unit: 'GB' }, { year: 2025, value: 12, unit: 'GB' }, { year: 2026, value: 12, unit: 'GB' }] },
  ],
  pcNotebook: [
    { serverType: 'traditional', label: 'Desktop', metrics: [{ year: 2023, value: 16, unit: 'GB' }, { year: 2024, value: 16, unit: 'GB' }, { year: 2025, value: 32, unit: 'GB' }, { year: 2026, value: 32, unit: 'GB' }] },
    { serverType: 'ai', label: 'AI PC', metrics: [{ year: 2023, value: 16, unit: 'GB' }, { year: 2024, value: 32, unit: 'GB' }, { year: 2025, value: 32, unit: 'GB' }, { year: 2026, value: 64, unit: 'GB' }] },
  ],
  electricVehicle: [
    { serverType: 'traditional', label: 'Standard EV', metrics: [{ year: 2023, value: 4, unit: 'GB' }, { year: 2024, value: 8, unit: 'GB' }, { year: 2025, value: 8, unit: 'GB' }, { year: 2026, value: 16, unit: 'GB' }] },
    { serverType: 'ai', label: 'Autonomous EV', metrics: [{ year: 2023, value: 16, unit: 'GB' }, { year: 2024, value: 32, unit: 'GB' }, { year: 2025, value: 64, unit: 'GB' }, { year: 2026, value: 128, unit: 'GB' }] },
  ],
  ioe: [
    { serverType: 'traditional', label: 'Standard IoE', metrics: [{ year: 2023, value: 0.5, unit: 'GB' }, { year: 2024, value: 1, unit: 'GB' }, { year: 2025, value: 1, unit: 'GB' }, { year: 2026, value: 2, unit: 'GB' }] },
    { serverType: 'ai', label: 'AI Edge', metrics: [{ year: 2023, value: 2, unit: 'GB' }, { year: 2024, value: 4, unit: 'GB' }, { year: 2025, value: 8, unit: 'GB' }, { year: 2026, value: 8, unit: 'GB' }] },
  ],
  automotive: [
    { serverType: 'traditional', label: 'ADAS', metrics: [{ year: 2023, value: 8, unit: 'GB' }, { year: 2024, value: 8, unit: 'GB' }, { year: 2025, value: 16, unit: 'GB' }, { year: 2026, value: 16, unit: 'GB' }] },
    { serverType: 'ai', label: 'Infotainment', metrics: [{ year: 2023, value: 4, unit: 'GB' }, { year: 2024, value: 8, unit: 'GB' }, { year: 2025, value: 8, unit: 'GB' }, { year: 2026, value: 16, unit: 'GB' }] },
  ],
};

// Per-application total wafer demand
const TOTAL_WAFER_DEMAND_BY_APP: Record<ApplicationType, TotalWaferDemand[]> = {
  traditionalServer: [{ year: 2023, total: 2180, isEstimate: false }, { year: 2024, total: 2350, isEstimate: false }, { year: 2025, total: 2580, isEstimate: true }, { year: 2026, total: 2800, isEstimate: true }],
  aiServer: [{ year: 2023, total: 680, isEstimate: false }, { year: 2024, total: 1250, isEstimate: false }, { year: 2025, total: 2100, isEstimate: true }, { year: 2026, total: 3200, isEstimate: true }],
  smartphone: [{ year: 2023, total: 1850, isEstimate: false }, { year: 2024, total: 1920, isEstimate: false }, { year: 2025, total: 2010, isEstimate: true }, { year: 2026, total: 2080, isEstimate: true }],
  pcNotebook: [{ year: 2023, total: 780, isEstimate: false }, { year: 2024, total: 820, isEstimate: false }, { year: 2025, total: 870, isEstimate: true }, { year: 2026, total: 920, isEstimate: true }],
  electricVehicle: [{ year: 2023, total: 120, isEstimate: false }, { year: 2024, total: 180, isEstimate: false }, { year: 2025, total: 260, isEstimate: true }, { year: 2026, total: 380, isEstimate: true }],
  ioe: [{ year: 2023, total: 420, isEstimate: false }, { year: 2024, total: 480, isEstimate: false }, { year: 2025, total: 540, isEstimate: true }, { year: 2026, total: 610, isEstimate: true }],
  automotive: [{ year: 2023, total: 350, isEstimate: false }, { year: 2024, total: 410, isEstimate: false }, { year: 2025, total: 480, isEstimate: true }, { year: 2026, total: 560, isEstimate: true }],
};

// News queries per application
const NEWS_QUERIES: Record<ApplicationType, { queryKo: string; queryEn: string }> = {
  traditionalServer: { queryKo: '서버 반도체 DRAM 수요 전망', queryEn: 'server semiconductor DRAM demand forecast' },
  aiServer: { queryKo: 'AI 서버 반도체 HBM 수요', queryEn: 'AI server semiconductor HBM demand' },
  smartphone: { queryKo: '스마트폰 반도체 메모리 수요', queryEn: 'smartphone semiconductor memory demand' },
  pcNotebook: { queryKo: 'PC 노트북 반도체 메모리', queryEn: 'PC notebook semiconductor memory' },
  electricVehicle: { queryKo: '전기차 반도체 수요 전망', queryEn: 'electric vehicle semiconductor demand' },
  ioe: { queryKo: 'IoT 반도체 수요 전망', queryEn: 'IoT semiconductor demand forecast' },
  automotive: { queryKo: '자동차 반도체 수요 전망', queryEn: 'automotive semiconductor demand forecast' },
};

export const VCM_DATA: VcmData = {
  versions: VCM_VERSIONS,
  applicationDemands: APPLICATION_DEMANDS,
  deviceWaferDemands: DEVICE_WAFER_DEMANDS,
  mountPerUnit: MOUNT_PER_UNIT,
  mountPerUnitByApp: MOUNT_PER_UNIT_BY_APP,
  totalWaferDemand: TOTAL_WAFER_DEMAND,
  totalWaferDemandByApp: TOTAL_WAFER_DEMAND_BY_APP,
  news: VCM_NEWS,
  newsQueries: NEWS_QUERIES,
  applicationTable: APPLICATION_TABLE,
};
