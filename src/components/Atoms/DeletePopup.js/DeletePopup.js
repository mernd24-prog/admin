import React from "react";
import ButtonTransparent from "../../ButtonTransparent/button";
import NewButton from "../../Button/NewButton";

const DeletePopup = ({
  isDeleteModalOpen,
  closeDeleteModal,
  confirmDelete,
  DeleteHeading,
}) => {
  return (
    <div>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[#ffffff] p-8 rounded-[19px] shadow-lg text-center md:w-[500px] w-11/12 mx-auto">
            <div className="flex items-center justify-center mb-4">
              <img src="/Img/delete.png" alt="" />
            </div>
            <h2 className="text-[17px] font-[600] text-black mb-4">
              {DeleteHeading}
            </h2>
            <div className="flex items-center justify-center gap-4 py-6">
              <ButtonTransparent onClick={closeDeleteModal}>
                {" "}
                Cancel
              </ButtonTransparent>
              <NewButton onClick={confirmDelete}> Yes</NewButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletePopup;
