// src/app/loading.tsx
import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#19221E] px-4 pt-3 pb-24 max-w-md mx-auto space-y-4 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between py-2 border-b border-[#E5DFD1]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E5DFD1]" />
          <div className="h-5 w-24 bg-[#E5DFD1] rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-12 bg-[#E5DFD1] rounded-full" />
          <div className="h-6 w-16 bg-[#E5DFD1] rounded-full" />
        </div>
      </div>

      {/* Greeting Skeleton */}
      <div className="space-y-1.5 pt-1">
        <div className="h-7 w-36 bg-[#E5DFD1] rounded-xl" />
        <div className="h-4 w-48 bg-[#E5DFD1] rounded-lg" />
      </div>

      {/* Hero Action Card Skeleton */}
      <div className="bg-white p-4.5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-5 w-28 bg-[#E5DFD1] rounded-lg" />
          <div className="h-6 w-20 bg-[#E5DFD1] rounded-full" />
        </div>
        <div className="h-3 w-40 bg-[#E5DFD1] rounded" />
        <div className="h-10 w-full bg-[#E5DFD1] rounded-2xl" />
      </div>

      {/* 2-Column KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] space-y-2">
          <div className="h-3 w-16 bg-[#E5DFD1] rounded" />
          <div className="h-8 w-20 bg-[#E5DFD1] rounded-xl" />
          <div className="h-3 w-24 bg-[#E5DFD1] rounded" />
        </div>
        <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] space-y-2">
          <div className="h-3 w-16 bg-[#E5DFD1] rounded" />
          <div className="h-8 w-12 bg-[#E5DFD1] rounded-xl" />
          <div className="h-3 w-20 bg-[#E5DFD1] rounded" />
        </div>
      </div>

      {/* Recent Activity List Skeleton */}
      <div className="space-y-2.5 pt-2">
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 bg-[#E5DFD1] rounded" />
          <div className="h-3 w-12 bg-[#E5DFD1] rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-3.5 rounded-2xl border border-[#E5DFD1] flex items-center justify-between"
            >
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-[#E5DFD1] rounded" />
                <div className="h-3 w-20 bg-[#E5DFD1] rounded" />
              </div>
              <div className="h-4 w-16 bg-[#E5DFD1] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
