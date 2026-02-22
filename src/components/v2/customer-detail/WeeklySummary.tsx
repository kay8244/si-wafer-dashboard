'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WeeklySummary as WeeklySummaryType, CustomerDetailId } from '@/types/v2';

interface Props {
  data: WeeklySummaryType;
  customerId: CustomerDetailId;
  foundryData?: string;
  mktInfo?: string;
}

function getStorageKey(customerId: CustomerDetailId) {
  return `weeklyComment_${customerId}`;
}

function getTimestampKey(customerId: CustomerDetailId) {
  return `weeklyComment_ts_${customerId}`;
}

export default function WeeklySummary({ data, customerId, foundryData, mktInfo }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(data.comment);
  const [lastModified, setLastModified] = useState<string | null>(null);

  // Load from localStorage on mount or customer change
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(customerId));
    const savedTs = localStorage.getItem(getTimestampKey(customerId));
    if (saved !== null) {
      setComment(saved);
      setLastModified(savedTs);
    } else {
      setComment(data.comment);
      setLastModified(null);
    }
    setIsEditing(false);
  }, [customerId, data.comment]);

  const save = useCallback(() => {
    const ts = new Date().toLocaleString('ko-KR');
    localStorage.setItem(getStorageKey(customerId), comment);
    localStorage.setItem(getTimestampKey(customerId), ts);
    setLastModified(ts);
    setIsEditing(false);
  }, [comment, customerId]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          {data.weekLabel} - 고객 회의록
        </h3>
        <button
          onClick={() => {
            if (isEditing) {
              save();
            } else {
              setIsEditing(true);
            }
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {isEditing ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              저장
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              수정
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          rows={4}
          autoFocus
        />
      ) : (
        <p className="flex gap-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <span className="mt-0.5 text-gray-400">&#8226;</span>
          <span>{comment}</span>
        </p>
      )}

      {lastModified && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          마지막 수정: {lastModified}
        </p>
      )}

      {(foundryData || mktInfo) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {foundryData && (
            <div className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <span className="font-semibold">Foundry: </span>{foundryData}
            </div>
          )}
          {mktInfo && (
            <div className="rounded border border-green-100 bg-green-50 px-2 py-1 text-xs text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              <span className="font-semibold">Mkt: </span>{mktInfo}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
