
import React from 'react'
import { IoClose, IoSearchOutline } from 'react-icons/io5'

const SearchInput = ({ placeholder, searchTerm, handleRemove, handleChange }) => {


  return (
    <div className="relative w-full ">

      {
        searchTerm ? <IoClose
          className="absolute z-10 text-gray-800 transform -translate-y-1/2 right-3 top-1/2"
          size={20} onClick={handleRemove}
        /> : <IoSearchOutline
          className="absolute z-10 transform -translate-y-1/2 left-3 top-1/2 text-[#082f91]"
          size={20}
        />
      }
      <input
        type="text"
        placeholder={placeholder || "Search..."}
        value={searchTerm}
        onChange={handleChange}
        onInput={(e) => {
          e.target.value = e.target.value.replace(/^\s+/, '');
        }}
        className="admin-input block pr-10 pl-10"
      />

    </div>
  )
}

export default SearchInput
