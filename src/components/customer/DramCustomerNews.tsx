'use client';
import { DramCustomerId } from '@/types/customer';
import { useDramCustomerNews } from '@/hooks/useDramCustomerNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface DramCustomerNewsProps {
  customerId: DramCustomerId;
  companyName: string;
  companyColor: string;
  onClose: () => void;
}

export default function DramCustomerNews({ customerId, companyName, companyColor, onClose }: DramCustomerNewsProps) {
  const { articles, answer, loading, error } = useDramCustomerNews(customerId);
  return <GenericNewsPanel title={companyName} color={companyColor} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
