'use client';

import type { WeeklySummary as WeeklySummaryType } from '@/types/v2';

interface Props {
  data: WeeklySummaryType;
  foundryData?: string;
  mktInfo?: string;
}

export default function WeeklySummary({ data, foundryData, mktInfo }: Props) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1.5 text-sm font-semibold text-gray-800">
        {data.weekLabel} - Summary
      </h3>
      <p className="flex gap-2 text-sm text-gray-700">
        <span className="mt-0.5 text-gray-400">•</span>
        <span>{data.comment}</span>
      </p>
      {(foundryData || mktInfo) && (
        <div className="mt-3 flex flex-wrap gap-4">
          {foundryData && (
            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
              <span className="font-semibold">Foundry: </span>
              {foundryData}
            </div>
          )}
          {mktInfo && (
            <div className="rounded border border-green-100 bg-green-50 px-3 py-1.5 text-xs text-green-800">
              <span className="font-semibold">Mkt Info: </span>
              {mktInfo}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
