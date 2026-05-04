/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';

const RecommendedProductTagWeightages = () => {
  const [tagData, setTagData] = useState([]);

  const initialData = [
    {
      tag: 'iPhone',
      product: 'iPhone 7',
      systemWeightage: '4.00',
      customWeightage: '1000.00',
      validTill: '2023-03-31',
    },
    {
      tag: 'iPhone',
      product: 'Apple iPhone 5s',
      systemWeightage: '25.00',
      customWeightage: '23.00',
      validTill: '2023-02-23',
    },
    {
      tag: 'iPhone',
      product: 'iPhone 7 plus',
      systemWeightage: '9.00',
      customWeightage: '0.00',
      validTill: '0000-00-00',
    },
    {
      tag: 'iPhone',
      product: 'iPhone 6s plus',
      systemWeightage: '12.00',
      customWeightage: '13.00',
      validTill: '2023-02-23',
    },
  ];

  useEffect(() => {
    setTagData(initialData);
  }, []);

  const handleInputChange = (index, key, value) => {
    const updatedData = [...tagData];
    updatedData[index][key] = value;
    setTagData(updatedData);
  };

  const tableHeadings = [
    'Tag',
    'Product',
    'System Weightage',
    'Custom Weightage',
    'Valid Till (custom weightage)',
  ];

  const tableRows = tagData.map((item, index) => [
    item.tag,
    item.product,
    item.systemWeightage,
    <input
      type="number"
      step="0.01"
      value={item.customWeightage}
      onChange={(e) =>
        handleInputChange(index, 'customWeightage', e.target.value)
      }
      className="w-24 px-2 py-1 border border-gray-300 rounded"
    />,
    <input
      type="date"
      value={item.validTill === '0000-00-00' ? '' : item.validTill}
      onChange={(e) => handleInputChange(index, 'validTill', e.target.value)}
      className="px-2 py-1 border border-gray-300 rounded"
    />,
  ]);

  return (
    <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
      <div className="p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]">
        <TableData
          Heading="Recommended Product Tag Weightages"
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

export default RecommendedProductTagWeightages;
