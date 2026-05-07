/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';

const ProductEventWeightages = () => {
  const [eventData, setEventData] = useState([]);

  const initialData = [
    { event: 'products order_paid', weightage: '10.00' },
    { event: 'products time_spent', weightage: '5.00' }
  ];

  useEffect(() => {
    setEventData(initialData);
  }, []);

  const handleWeightageChange = (index, value) => {
    const updated = [...eventData];
    updated[index].weightage = value;
    setEventData(updated);
  };

  const tableHeadings = ['Event', 'Weightage'];

  const tableRows = eventData.map((row, index) => [
    row.event,
    <input
      type="number"
      step="0.01"
      value={row.weightage}
      onChange={(e) => handleWeightageChange(index, e.target.value)}
      className="w-24 px-2 py-1 border border-gray-300 rounded"
    />
  ]);

  return (
    <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
      <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
        <TableData
          Heading="Product Event Weightages"
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          showAddButton={false}
        />
      </div>
    </div>
  );
};

export default ProductEventWeightages;
