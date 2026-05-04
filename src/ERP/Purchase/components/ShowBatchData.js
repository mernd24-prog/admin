import React, { useState } from "react";

const ShowBatchData = ({ batchOptions, onSelectBatch, selectedBatch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-GB");
  };

  const filteredBatches = Array.isArray(batchOptions)
    ? batchOptions.filter((batch) =>
        batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleOkClick = () => {
    if (selectedBatch && onSelectBatch) {
      onSelectBatch(selectedBatch);
    }
  };
const formatExpDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  
  // MM/DD/YY format
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
};

  return (
    <>
      <div className="p-4 text-sm font-sans">
        <h2 className="text-lg font-semibold mb-3">Select a Batch</h2>

        <input
          type="text"
          placeholder="Search by Batch Code"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 px-3 py-2 border border-gray-300 rounded w-full"
        />

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">Select</th>
                <th className="p-2 border">Batch Code</th>
                <th className="p-2 border">Manufacture Date</th>
                <th className="p-2 border">Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length > 0 ? (
                filteredBatches?.map((batch, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-blue-50 ${
                      selectedBatch?._id === batch._id ? "bg-blue-100" : ""
                    }`}
                    onClick={() => onSelectBatch(batch)}
                  >
                    <td className="p-2 border text-center">
                      <input
                        type="radio"
                        name="batch"
                        checked={selectedBatch?.id === batch.id}
                        onChange={() => onSelectBatch(batch)}
                      />
                    </td>
                    <td className="p-2 border">{batch.batchCode}</td>
                    <td className="p-2 border">
                         {formatExpDate(batch.manufactureDate)}
                     
                    </td>
                    <td className="p-2 border">{formatExpDate(batch.expiryDate)}
                
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">
                    No matching batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button
          onClick={handleOkClick}
          className="p-2 bg-black text-black rounded font-bold hover:bg-gray-800"
        >
          OK
        </button>
      </div>
    </>
  );
};

export default ShowBatchData;

// import React, { useState } from "react";

// const ShowBatchData = ({ batchOptions,onSelectBatch,selectedBatchCode,setSelectedBatchCode}) => {
//   const [searchTerm, setSearchTerm] = useState("");
//   const formatDate = (timestamp) => {
//     if (!timestamp) return "N/A";
//     return new Date(timestamp).toLocaleDateString("en-GB");
//   };

//   const filteredBatches = Array.isArray(batchOptions)
//     ? batchOptions.filter((batch) =>
//         batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase())
//       )
//     : [];

// const handleRadioChange = (code) => {
//     setSelectedBatchCode(code);
//   };

//   const handleOkClick = () => {
//     const selectedBatch = batchOptions.find(
//       (batch) => batch.batchCode === selectedBatchCode
//     );
//     if (selectedBatch && onSelectBatch) {
//       console.log("selectedBatch",selectedBatch)
//       onSelectBatch(selectedBatch);
//     }
//   };

//   return (
//     <>
//       <div className="p-4 text-sm font-sans">
//         <h2 className="text-lg font-semibold mb-3">Select a Batch</h2>

//         <input
//           type="text"
//           placeholder="Search by Batch Code"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="mb-4 px-3 py-2 border border-gray-300 rounded w-full"
//         />

//         <div className="overflow-x-auto">
//           <table className="w-full border border-gray-300 rounded">
//             <thead className="bg-gray-100 text-left">
//               <tr>
//                 <th className="p-2 border">Select</th>
//                 <th className="p-2 border">Batch Code</th>
//                 <th className="p-2 border">Manufacture Date</th>
//                 <th className="p-2 border">Expiry Date</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredBatches.length > 0 ? (
//                 filteredBatches.map((batch, index) => (
//                   <tr
//                     key={index}
//                     className={`hover:bg-blue-50 ${
//                       selectedBatchCode === batch.batchCode ? "bg-blue-100" : ""
//                     }`}
//                   >
//                     <td className="p-2 border text-center">
//                       <input
//                         type="radio"
//                         name="batch"
//                         value={batch.id}
//                         checked={selectedBatchCode === batch.batchCode}
//                         onChange={() => handleRadioChange(batch)}
//                       />
//                     </td>
//                     <td className="p-2 border">{batch.batchCode}</td>
//                     <td className="p-2 border">
//                       {formatDate(batch.manufactureDate)}
//                     </td>
//                     <td className="p-2 border">
//                       {formatDate(batch.expiryDate)}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="4" className="text-center p-4 text-gray-500">
//                     No matching batches found.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//       <div className="flex justify-end mt-2">
//         <button
//           onClick={handleOkClick}
//           className="p-2 bg-black text-black rounded font-bold hover:bg-gray-800"
//         >
//           OK
//         </button>
//       </div>
//     </>
//   );
// };

// export default ShowBatchData;
