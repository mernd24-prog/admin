import React, { useState } from "react";

const ShowTypeData = ({ headDataList = [], onSelectBatch, selectedHead }) => {
  const [selectedId, setSelectedId] = useState(selectedHead?._id || "");

  const handleRadioChange = (head) => {
    setSelectedId(head._id);
    onSelectBatch(head);
  };

  const handleOkClick = () => {
    const selected = headDataList?.options?.find(opt => opt._id === selectedId);
    if (selected && onSelectBatch) {
      onSelectBatch(selected);
    }
  };

  return (
    <div className="p-4 text-sm font-sans">
      <h2 className="text-lg font-semibold mb-3">Product Options</h2>
      {!headDataList?.options?.length ? (
        <p>No product options available.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Select</th>
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border">MRP</th>
                  <th className="p-2 border">Discount</th>
                  <th className="p-2 border">Sale Price</th>
                  <th className="p-2 border">Remark</th>
                  <th className="p-2 border">Packaging</th>
                </tr>
              </thead>
              <tbody>
                {headDataList?.options?.map(opt => (
                  <tr 
                    key={opt._id} 
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleRadioChange(opt)}
                  >
                    <td className="p-2 border text-center">
                      <input
                        type="radio"
                        name="opt"
                        checked={selectedId === opt._id}
                        onChange={() => handleRadioChange(opt)}
                      />
                    </td>
                    <td className="p-2 border">{opt.type}</td>
                    <td className="p-2 border">₹{opt.mrp}</td>
                    <td className="p-2 border">{opt.discount}%</td>
                    <td className="p-2 border">₹{opt.salePrice}</td>
                    <td className="p-2 border">{opt.remark}</td>
                    <td className="p-2 border">{opt.packaging}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-2">
            <button
              className="p-2 bg-black text-black rounded font-bold hover:bg-gray-800"
              onClick={handleOkClick}
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShowTypeData;

// import React, { useState } from "react";

// const ShowTypeData = ({ headDataList = [], onSelectBatch }) => {
//   const [selectedId, setSelectedId] = useState("");

//   const handleRadioChange = (id) => {
//     setSelectedId(id);
//   };

//   const handleOkClick = () => {
//     const selected = headDataList?.options.find(opt => opt._id === selectedId);
//     if (selected && onSelectBatch) {
//       onSelectBatch(selected); // Return entire object including remark, packaging, type etc.
//     }
//   };

//   return (
//     <div className="p-4 text-sm font-sans">
//       <h2 className="text-lg font-semibold mb-3">Product Options</h2>
//       {headDataList?.length === 0 ? (
//         <p>No product options available.</p>
//       ) : (
//         <>
//           <div className="overflow-x-auto">
//             <table className="min-w-full border border-gray-300">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="p-2 border">Select</th>
//                   <th className="p-2 border">Type</th>
//                   <th className="p-2 border">MRP</th>
//                   <th className="p-2 border">Discount</th>
//                   <th className="p-2 border">Sale Price</th>
//                   <th className="p-2 border">Remark</th>
//                   <th className="p-2 border">Packaging</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {headDataList?.options.map(opt => (
//                   <tr key={opt._id} className="text-center">
//                     <td className="p-2 border">
//                       <input
//                         type="radio"
//                         name="opt"
//                         value={opt._id}
//                         checked={selectedId === opt._id}
//                         onChange={() => handleRadioChange(opt._id)}
//                       />
//                     </td>
//                     <td className="p-2 border">{opt.type}</td>
//                     <td className="p-2 border">₹{opt.mrp}</td>
//                     <td className="p-2 border">{opt.discount}%</td>
//                     <td className="p-2 border">₹{opt.salePrice}</td>
//                     <td className="p-2 border">{opt.remark}</td>
//                     <td className="p-2 border">{opt.packaging}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="flex justify-end mt-2">
//             <button
//               className="p-2 bg-black text-black rounded font-bold hover:bg-gray-800"
//               onClick={handleOkClick}
//             >
//               OK
//             </button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default ShowTypeData;


// // import React, { useState } from "react";

// // const ShowTypeData = ({ headDataList = [],onSelectBatch }) => {
// //   const [selectedBatchCode, setSelectedBatchCode] = useState("");
// // console.log("headDataListheadDataList",headDataList)
// // const handleRadioChange = (code) => {
// //     setSelectedBatchCode(code);
// //   };

// //   const handleOkClick = () => {
// //     const selectedBatch = headDataList?.options.find(
// //       (batch) => batch.batchCode === selectedBatchCode
// //     );
// //     if (selectedBatch && onSelectBatch) {
// //       onSelectBatch(selectedBatch);
// //     }
// //   };
// //   return (
// //     <div className="p-4 text-sm font-sans">
// //       <h2 className="text-lg font-semibold mb-3">Product Options</h2>
// //       {headDataList?.length === 0 ? (
// //         <p>No product options available.</p>
// //       ) : (
// //         <>
// //           <div className="overflow-x-auto">
// //             <table className="min-w-full border border-gray-300">
// //               <thead className="bg-gray-100">
// //                 <tr>
// //                   <th className="p-2 border">Select</th>
// //                   <th className="p-2 border">Type</th>
// //                   <th className="p-2 border">MRP</th>
// //                   <th className="p-2 border">Discount</th>
// //                   <th className="p-2 border">Sale Price</th>
// //                   <th className="p-2 border">Remark</th>
// //                   <th className="p-2 border">Packaging</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {headDataList?.options.map((opt) => (
// //                   <tr key={opt._id} className="text-center">
// //                     <td className="p-2 border">
// //                     <input
// //                         type="radio"
// //                         name="opt"
// //                         value={opt._id}
// //                         checked={selectedBatchCode === opt.batchCode}
// //                         onChange={() => handleRadioChange(opt.batchCode)}
// //                       />
// //                     </td>
// //                     <td className="p-2 border">{opt.type}</td>
// //                     <td className="p-2 border">₹{opt.mrp}</td>
// //                     <td className="p-2 border">{opt.discount}%</td>
// //                     <td className="p-2 border">₹{opt.salePrice}</td>
// //                     <td className="p-2 border">{opt.remark}</td>
// //                     <td className="p-2 border">{opt.packaging}</td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>
// //           <div className="flex justify-end mt-2">
// //             <button className="p-2 bg-black text-black rounded font-bold hover:bg-gray-800" onClick={handleOkClick}>
// //               OK
// //             </button>
// //           </div>
// //         </>
// //       )}
// //     </div>
// //   );
// // };

// // export default ShowTypeData;
