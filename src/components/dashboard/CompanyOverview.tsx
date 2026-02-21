'use client';

import { CompanyFinancialData, CompanyId } from '@/types/company';
import { COMPANY_IDS } from '@/lib/constants';
import CompanyCard from './CompanyCard';

interface CompanyOverviewProps {
  companies: Record<CompanyId, CompanyFinancialData>;
  selectedCompanyId?: CompanyId | null;
  onSelectCompany?: (id: CompanyId) => void;
}

export default function CompanyOverview({
  companies,
  selectedCompanyId,
  onSelectCompany,
}: CompanyOverviewProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-gray-800">기업별 최신 실적 요약</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {COMPANY_IDS.map((id) => (
          <CompanyCard
            key={id}
            data={companies[id]}
            selected={selectedCompanyId === id}
            onSelect={() => onSelectCompany?.(id)}
          />
        ))}
      </div>
    </section>
  );
}
