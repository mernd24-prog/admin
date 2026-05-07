/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
// import Select from 'react-select';
import TableData from '../../../components/Atoms/TableData/TableData';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';


const ProductTags = () => {
  const [apiRes, setApiRes] = useState([])
  const [filters] = useState({ search: "" })

  const dummydata = [
    {
      name: "Adobe InDesign, Word"
    },
    {
      name: "AUSHA 4K 60fps Dual Touch Screen Sports Camera Waterproof Underwater Camera"
    },
    {
      name: "Back Printed Fullsleeve Hooded Sweatshirt for Men"
    },
    {
      name: "Bata COREY TRIM Loafers"
    },
    {
      name: "boAt Stone 190 Portable Wireless Speaker"
    },
    {
      name: "Bohemia Gypsy Tibetan Vintage Coin Necklace for Girls &amp; Women"
    },
    {
      name: "Car Tyre Cleaning Brush Scrubber with Antislip Handle"
    },
    {
      name: "Casual Backpack for Girls"
    },
    {
      name: "Adobe InDesign, Word"
    }
  ];
  const tagOptions = [
    { value: 'new', label: 'New' },
    { value: 'featured', label: 'Featured' },
    { value: 'sale', label: 'Sale' },
    { value: 'popular', label: 'Popular' },
  ];

  useEffect(() => {
    setApiRes(dummydata)
  }, [])
  const tableHeadings = [
    "Product Name",
    "Tags"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    return [
      ele?.name,
      <span className=''>
        <FilterSelect
          key={index}
          isMulti
          options={tagOptions}
          onChange={(selected) => console.log(`Selected for ${ele.name}:`, selected)}
          styles={{ container: (base) => ({ ...base, width: 500 }) }}
        />
      </span>
    ];
  });


  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <div className=''><h3>Home / Tags</h3></div>
        <div className=' overflow-auto overflow-y-auto bg-white '>
          <div className='p-2 border-b'>
            <SearchComponent filters={filters} />
          </div>
          <TableData
            Heading="Shops"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
          />
        </div>
      </div>
    </>
  )
}

export default ProductTags