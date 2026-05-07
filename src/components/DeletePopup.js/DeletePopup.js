import React from 'react'

const DeletePopup = ({
  isDeleteModalOpen,
  closeDeleteModal,
  confirmDelete,
  DeleteHeading
}) => {
  return (
    <div>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="bg-[#fff] p-8 rounded-[19px] shadow-lg text-center md:w-[500px] w-11/12 mx-auto">
            <div className="flex items-center justify-center mb-4">
              <img src="/Img/delete.png" alt="" />
            </div>
            <h2 className="text-[17px] font-[600] text-black mb-4">{DeleteHeading}</h2>
            <p className='text-[#1E293B] font-[400] text-[16px]'>Are you sure want to delete this file? You can’t undo this action</p>
            <div className="flex items-center justify-center gap-4 py-6"> 
              <button onClick={closeDeleteModal} className='group relative w-full flex space-x-4 justify-center py-2 px-4 border-[#979797] border text-[16px] font-[600] font-[Inter] rounded text-[#979797] bg-white hover:scale-95 transition-all duration-300 ease-in-out'>Cancel</button>
              <button onClick={confirmDelete} className='group w-full flex space-x-4 justify-center py-2 px-4 border-[#D8D8D8] border text-[16px] font-[600] font-[Inter] rounded text-black bg-[#DE0015] hover:scale-95 transition-all duration-300 ease-in-out'>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeletePopup;


