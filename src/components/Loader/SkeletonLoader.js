import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export const SkeletonLoader = ({
  count = 1,
  height = 20,
  width,
  circle = false,
}) => {
  return (
    <Skeleton
      count={count}
      height={height}
      width={width}
      circle={circle}
      baseColor="#f8f4f0"
      highlightColor="#e8e4e0"
    />
  );
};

export const TableSkeletonLoader = ({ columns = 5, rows = 10 }) => {
  return (
    <div className="w-full">
      <div className="hidden w-full lg:block overflow-hidden overflow-x-auto overflow-y-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-[#f8f4f0] border-b-[1px] border-[#e0dcd8] h-16">
            <tr>
              {Array(columns)
                .fill(0)
                .map((_, index) => (
                  <th key={index} className="p-2">
                    <SkeletonLoader width={100} />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e4e0]">
            {Array(rows)
              .fill(0)
              .map((_, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[#f0ece8]">
                  {Array(columns)
                    .fill(0)
                    .map((_, cellIndex) => (
                      <td key={cellIndex} className="p-2">
                        <SkeletonLoader width={Math.random() * 100 + 50} />
                      </td>
                    ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden overflow-y-auto lg:hidden">
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="p-4 mb-4 bg-[#f8f4f0] border border-[#e0dcd8] rounded-lg"
            >
              {Array(columns)
                .fill(0)
                .map((_, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="flex items-center justify-between pb-3 mb-3 border-b border-[#e8e4e0]"
                  >
                    <SkeletonLoader width={80} />
                    <SkeletonLoader width={120} />
                  </div>
                ))}
            </div>
          ))}
      </div>
    </div>
  );
};

export const CardSkeletonLoader = ({ count = 4 }) => (
  <div
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    aria-label="Loading cards"
  >
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="admin-card p-4">
        <SkeletonLoader height={18} width="45%" />
        <div className="mt-4">
          <SkeletonLoader height={30} width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const StatCardSkeletonLoader = () => (
  <div
    className="h-full min-h-[190px] w-full min-w-0 rounded-[10px] border border-[#e7e7e7] bg-gradient-to-br from-[#FFFFFF] to-[#F4F1ED] px-[26px] py-8 shadow-[0_2px_6px_rgba(20,20,20,0.16)]"
    aria-label="Loading stat card"
  >
    <div className="mb-[24px] flex min-h-10 justify-between">
      <SkeletonLoader circle height={40} width={40} />
      <SkeletonLoader height={24} width={24} />
    </div>
    <SkeletonLoader height={18} width="45%" />
    <div className="mt-3">
      <SkeletonLoader height={30} width="60%" />
    </div>
    <div className="mt-2">
      <SkeletonLoader height={12} width="35%" />
    </div>
  </div>
);

export const FormSkeletonLoader = ({ fields = 4 }) => (
  <div className="admin-card space-y-5 p-5" aria-label="Loading form">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <SkeletonLoader height={12} width={100} />
        <div className="mt-2">
          <SkeletonLoader height={40} />
        </div>
      </div>
    ))}
  </div>
);

export const PageSkeletonLoader = () => (
  <div className="space-y-5 p-6" aria-label="Loading page">
    <SkeletonLoader height={26} width={220} />
    <CardSkeletonLoader />
    <TableSkeletonLoader rows={6} />
  </div>
);

export const QueryDetailsSkeleton = () => (
  <div className="space-y-5" aria-label="Loading query details">
    <div className="grid gap-3 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4 text-sm sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index}>
          <SkeletonLoader height={12} width="40%" />
          <div className="mt-1.5">
            <SkeletonLoader height={16} width="70%" />
          </div>
        </div>
      ))}
    </div>

    <div>
      <SkeletonLoader height={12} width={70} />
      <div className="mt-1.5">
        <SkeletonLoader height={18} width="35%" />
      </div>
    </div>

    <div>
      <SkeletonLoader height={12} width={60} />
      <div className="mt-1.5">
        <SkeletonLoader height={18} width="80%" />
      </div>
    </div>

    <div>
      <SkeletonLoader height={12} width={65} />
      <div className="mt-2 rounded-md border border-[var(--admin-line)] bg-white p-3">
        <SkeletonLoader height={14} count={3} />
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <SkeletonLoader height={12} width={50} />
        <div className="mt-1.5">
          <SkeletonLoader height={38} />
        </div>
      </div>
    </div>

    <div>
      <SkeletonLoader height={12} width={80} />
      <div className="mt-1.5">
        <SkeletonLoader height={100} />
      </div>
    </div>
  </div>
);

export const SellerDetailsSkeletonLoader = () => (
  <div className="space-y-4" aria-label="Loading seller details">
    <div className="flex items-center justify-between">
      <SkeletonLoader height={20} width={200} />
      <SkeletonLoader height={26} width={100} />
    </div>

    <div className="flex flex-wrap gap-2 pb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonLoader key={i} height={38} width={150} />
      ))}
    </div>

    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-6">
      <div>
        <SkeletonLoader height={20} width={130} />
        <div className="mt-1">
          <SkeletonLoader height={14} width={280} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px,1fr]">
        <div className="flex flex-col items-center text-center rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
          <SkeletonLoader circle height={96} width={96} />
          <SkeletonLoader height={18} width={120} />
          <SkeletonLoader height={14} width={140} />
          <SkeletonLoader height={12} width={160} />
          <div className="mt-4 w-full">
            <SkeletonLoader height={36} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <SkeletonLoader height={14} width={100} />
              <div className="mt-1.5"><SkeletonLoader height={40} /></div>
            </div>
            <div>
              <SkeletonLoader height={14} width={130} />
              <div className="mt-1.5"><SkeletonLoader height={40} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <SkeletonLoader height={14} width={140} />
              <div className="mt-1.5"><SkeletonLoader height={40} /></div>
            </div>
            <div>
              <SkeletonLoader height={14} width={110} />
              <div className="mt-1.5"><SkeletonLoader height={40} /></div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <SkeletonLoader height={40} width={120} />
          </div>
        </div>
      </div>
    </div>
  </div>
);
export const OrganizationSkeletonLoader = ({ actionLabel }) => (
  <div
    className="mb-4 rounded-lg border border-gray-200 overflow-hidden bg-white animate-pulse"
    aria-label="Loading store organization"
  >
    {actionLabel && (
      <div className="flex items-center gap-2.5 bg-blue-50 px-4 py-2.5 border-b border-blue-100 text-xs font-semibold text-blue-700">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Updating store status ({actionLabel})… Please wait.</span>
      </div>
    )}

    {/* Header */}
    <div className="flex flex-wrap items-start justify-between gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
      <div className="space-y-1.5">
        <SkeletonLoader height={18} width={200} />
        <SkeletonLoader height={12} width={130} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} height={24} width={80} />
        ))}
      </div>
    </div>

    <div className="divide-y divide-gray-100 px-4">
      {/* Contact info */}
      <div className="py-4">
        <SkeletonLoader height={14} width={150} />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkeletonLoader height={11} width={80} />
              <SkeletonLoader height={16} width={160} />
            </div>
          ))}
        </div>
      </div>

      {/* Business identity */}
      <div className="py-4">
        <SkeletonLoader height={14} width={130} />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkeletonLoader height={11} width={70} />
              <SkeletonLoader height={16} width={140} />
            </div>
          ))}
        </div>
      </div>

      {/* Addresses */}
      <div className="py-4">
        <SkeletonLoader height={14} width={100} />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-100 p-3 space-y-2 bg-gray-50/50"
            >
              <SkeletonLoader height={14} width={100} />
              <SkeletonLoader height={12} width="90%" />
              <SkeletonLoader height={12} width="70%" />
            </div>
          ))}
        </div>
      </div>

      {/* KYC Documents */}
      <div className="py-4">
        <SkeletonLoader height={14} width={120} />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-xl border border-gray-100 p-4 text-center bg-gray-50/40 space-y-2"
            >
              <SkeletonLoader height={32} width={32} />
              <SkeletonLoader height={14} width={100} />
              <SkeletonLoader height={10} width={70} />
              <div className="pt-2 w-full">
                <SkeletonLoader height={28} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="py-4">
        <SkeletonLoader height={12} width={180} />
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} height={32} width={110} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
