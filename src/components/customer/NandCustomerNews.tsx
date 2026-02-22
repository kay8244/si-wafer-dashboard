'use client';
import { NandCustomerId } from '@/types/nand-customer';
import { useNandCustomerNews } from '@/hooks/useNandCustomerNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface NandCustomerNewsProps {
  customerId: NandCustomerId;
  companyName: string;
  companyColor: string;
  onClose: () => void;
}

export default function NandCustomerNews({ customerId, companyName, companyColor, onClose }: NandCustomerNewsProps) {
  const { articles, answer, loading, error } = useNandCustomerNews(customerId);
  return <GenericNewsPanel title={companyName} color={companyColor} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
