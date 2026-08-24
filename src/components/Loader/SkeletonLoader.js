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
// import React from 'react';
// import Skeleton from 'react-loading-skeleton';
// import 'react-loading-skeleton/dist/skeleton.css';

// export const SkeletonLoader = ({ count = 1, height = 20, width, circle = false }) => {
//   return (
//     <Skeleton
//       count={count}
//       height={height}
//       width={width}
//       circle={circle}
//       baseColor="#f3f3f3"
//       highlightColor="#ecebeb"
//     />
//   );
// };

// export const TableSkeletonLoader = ({ columns = 5, rows = 10 }) => {
//   return (
//     <div className="w-full">
//       <div className="hidden w-full border-b-[#ebedf0] lg:block overflow-hidden overflow-x-auto overflow-y-auto">
//         <table className="w-full text-left border-b table-auto">
//           <thead className="bg-[#F5F6FA] border-b-[1px] border-[#D2D2D2] h-16">
//             <tr>
//               {Array(columns).fill(0).map((_, index) => (
//                 <th key={index} className="p-2">
//                   <SkeletonLoader width={100} />
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {Array(rows).fill(0).map((_, rowIndex) => (
//               <tr key={rowIndex}>
//                 {Array(columns).fill(0).map((_, cellIndex) => (
//                   <td key={cellIndex} className="p-2">
//                     <SkeletonLoader width={Math.random() * 100 + 50} />
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//       <div className="mt-4 overflow-hidden overflow-y-auto lg:hidden">
//         {Array(5).fill(0).map((_, index) => (
//           <div key={index} className="p-4 mb-4 bg-white border border-[#dbdbdb]">
//             {Array(columns).fill(0).map((_, cellIndex) => (
//               <div key={cellIndex} className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
//                 <SkeletonLoader width={80} />
//                 <SkeletonLoader width={120} />
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
