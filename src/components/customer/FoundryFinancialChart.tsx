'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FOUNDRY_FINANCIAL_METRICS } from '@/lib/foundry-constants';
import GenericFinancialChart from '@/components/customer-shared/GenericFinancialChart';

interface FoundryFinancialChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
}

export default function FoundryFinancialChart({ customers }: FoundryFinancialChartProps) {
  return (
    <GenericFinancialChart
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={FOUNDRY_CUSTOMERS}
      financialMetrics={FOUNDRY_FINANCIAL_METRICS}
      currencyNoteKrw="TSMC·글로벌파운드리즈는 USD→KRW 환산 기준"
      currencyNoteOriginal="삼성 파운드리: KRW / TSMC·글로벌파운드리즈: USD"
    />
  );
}
