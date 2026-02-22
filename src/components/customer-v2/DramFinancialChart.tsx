'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import GenericFinancialChart from '@/components/customer-shared/GenericFinancialChart';

interface DramFinancialChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

export default function DramFinancialChart({ customers }: DramFinancialChartProps) {
  return (
    <GenericFinancialChart
      customerIds={DRAM_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={DRAM_CUSTOMERS}
      financialMetrics={DRAM_FINANCIAL_METRICS}
      currencyNoteKrw="마이크론은 USD→KRW 환산 기준"
      currencyNoteOriginal="삼성DS·SK하이닉스: KRW / 마이크론: USD"
    />
  );
}
