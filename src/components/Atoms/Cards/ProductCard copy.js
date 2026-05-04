import React, { useState } from 'react';
import { BsShield, BsTruck } from 'react-icons/bs';
import { CiShoppingCart } from 'react-icons/ci';
import { FaShoppingCart } from 'react-icons/fa';
import { FiPackage, FiZap } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { LuEye } from 'react-icons/lu';
import DefaultModal from '../Modal/DefaultRightSideModal';
import TableData from '../TableData/TableData';


const ProductCard = ({ product, onAdd }) => {
  const [addingId, setAddingId] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const options = product?.option_id?.options || [];
  const [isViewOpen, setIsViewOpen] = useState(false)

  console.log(product)

  const handleAddWithOption = (option) => {
    setAddingId(option._id);
    const productWithOption = {
      ...product,
      selectedOption: option,
      basePrice: option.mrp,
      salePrice: option.salePrice,
      selectedType: option.type,
      selectedPackaging: option.packaging,
      selectedRemark: option.remark,
      discount: option.discount
    };
    setTimeout(() => {
      onAdd(productWithOption);
      setAddingId(null);
    }, 500);
  };

  const handleQuickAdd = () => {
    if (options.length > 0) {
      handleAddWithOption(options[0]);
    } else {
      onAdd(product);
    }
  };

  const handleViewStock = (data) => {
    console.log("data===>", data)
    setIsViewOpen(true)
  }


  const tablesRow=()=>{

  }


  return (
    <div className="">
      <TableData tableHeadings={["Name", "Type", "Description", "Store"]} 
      TableData={tablesRow||[]}/>
    </div>
  );
};


export default ProductCard
