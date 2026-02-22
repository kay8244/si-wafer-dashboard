'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NAND_FINANCIAL_METRICS } from '@/lib/nand-constants';
import GenericFinancialChart from '@/components/customer-shared/GenericFinancialChart';

interface NandFinancialChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
}

export default function NandFinancialChart({ customers }: NandFinancialChartProps) {
  return (
    <GenericFinancialChart
      customerIds={NAND_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={NAND_CUSTOMERS}
      financialMetrics={NAND_FINANCIAL_METRICS}
      currencyNoteKrw="Western Digital은 USD→KRW 환산 기준"
      currencyNoteOriginal="삼성NAND·SK하이닉스NAND: KRW / Western Digital: USD"
    />
  );
}
