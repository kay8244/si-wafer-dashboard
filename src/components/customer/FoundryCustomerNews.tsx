'use client';
import { FoundryCustomerId } from '@/types/foundry-customer';
import { useFoundryCustomerNews } from '@/hooks/useFoundryCustomerNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface FoundryCustomerNewsProps {
  customerId: FoundryCustomerId;
  companyName: string;
  companyColor: string;
  onClose: () => void;
}

export default function FoundryCustomerNews({ customerId, companyName, companyColor, onClose }: FoundryCustomerNewsProps) {
  const { articles, answer, loading, error } = useFoundryCustomerNews(customerId);
  return <GenericNewsPanel title={companyName} color={companyColor} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
