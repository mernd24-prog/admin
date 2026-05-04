
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export const SkeletonLoader = ({ count = 1, height = 20, width, circle = false }) => {
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
              {Array(columns).fill(0).map((_, index) => (
                <th key={index} className="p-2">
                  <SkeletonLoader width={100} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e4e0]">
            {Array(rows).fill(0).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#f0ece8]">
                {Array(columns).fill(0).map((_, cellIndex) => (
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
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="p-4 mb-4 bg-[#f8f4f0] border border-[#e0dcd8] rounded-lg">
            {Array(columns).fill(0).map((_, cellIndex) => (
              <div key={cellIndex} className="flex items-center justify-between pb-3 mb-3 border-b border-[#e8e4e0]">
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