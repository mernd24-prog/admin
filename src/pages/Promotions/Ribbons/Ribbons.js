/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import Input from '../../../components/Atoms/Input/Input';
import AddButton from '../../../components/Button/AddButton';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import { Link } from 'react-router-dom';
import { createRibbon, deleteRibbon, enableDisableRibbon, getRibbonsList, updateRibbon } from '../../../Redux/citySlice';

const Ribbons = () => {
  const dispatch = useDispatch();
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    _id: '',
    name: '',
    color: '#000000',
    bgColor: '#FFFFFF',
    isDisable: false
  });
  const [errors, setErrors] = useState({});
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [deleteData, setDeleteData] = useState("");

  const size = 10;
  const selector = useSelector(state => state.city);
  const getListData = selector?.getRibbonsListData?.data?.data?.list;
  const totalItems = selector?.getRibbonsListData?.data?.data?.total || 0;

  // Fetch ribbons list
  const fetchRibbons = useCallback(() => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      searchFields: 'name',
      select: 'name color bgColor isDisable'
    };
    dispatch(getRibbonsList(reqData));
  }, [dispatch, pageNo, size]);

  useEffect(() => {
    fetchRibbons();
  }, [fetchRibbons, isRefresh]);
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(prevData => ({
      ...prevData,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Form validations
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.name?.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData?.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
      isValid = false;
    } else if (formData?.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
      isValid = false;
    }

    if (!formData?.color) {
      newErrors.color = 'Color is required';
      isValid = false;
    }

    if (!formData?.bgColor) {
      newErrors.bgColor = 'Background color is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      _id: '',
      name: '',
      color: '#000000',
      bgColor: '#FFFFFF',
      isDisable: false
    });
    setErrors({});
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const reqData = {
      name: formData.name.trim(),
      color: formData.color,
      bgColor: formData.bgColor,
      isDisable: formData.isDisable
    };
    dispatch(createRibbon(reqData))
      .unwrap()
      .then((res) => {
       if(res.error)
       {
        toast.error(res.error)
        return
       }
       else
       {
        toast.success(res.message || "Ribbon Created Successfully")
        setIsRefresh(!isRefresh)
        handleClose()
       }
      })
      .catch((error) => {
        console.error("Error creating ribbon:", error);
        toast.error(error || "Error in creating ribbon");
      });
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

 const tableRows = getListData?.map((ribbon) => [
    <CustomCheckbox
      key={`checkbox-${ribbon._id}`}
      checked={selectedRow.includes(ribbon._id)}
      onChange={(e) => handleRowCheckboxChange(e, ribbon._id)}
    />,
   <span
  key={`color-preview-${ribbon._id}`}
  className="px-2 py-1 rounded capitalize"
  style={{
    color: ribbon?.color,
    backgroundColor: ribbon?.bgColor,
  }}
>
  {ribbon?.name}
</span>
,
    <span key={`name-${ribbon._id}`} className="capitalize">
      {ribbon?.name}
    </span>,
   
    <div key={`status-${ribbon._id}`} className="flex flex-col">
      <label className="relative inline-flex" title="Enable/Disable">
        <ToggleButton
          key={`toggle-${ribbon._id}`}
          isToggle={!ribbon?.isDisable}
          handleClick={() => handleToggle(ribbon)}
        />
      </label>
    </div>,
    <span key={`actions-${ribbon._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: ribbon._id,
            name: ribbon.name,
            color: ribbon.color || '#000000',
            bgColor: ribbon.bgColor || '#FFFFFF',
            isDisable: ribbon.isDisable
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [ribbon._id] });
          setShowDeleteConfirmation(true);
        }}
        showLinkButton={false}
      />
    </span>,
]);

   const confirmDelete = () => {
      dispatch(deleteRibbon(deleteData)).unwrap()
        .then((res) => {
          if (res.error) {
            toast.error(res.error)
            return
          }
          else {
            toast.success(res.message || "Item Deleted Successfully")
            setShowDeleteConfirmation(false);
            setIsRefresh(!isRefresh)
          }
        }).catch((error) => {
          console.log("error", error)
          toast.error(error || "Error in Deleting ITem")
        })
    };

  const handleDisableFunc = () => {
    if (!toggleStates) return;
    const obj = {
      _id: [toggleStates._id],
      isDisable: !toggleStates.isDisable
    };

    dispatch(enableDisableRibbon(obj))
      .unwrap()
      .then((res) => {
        if(res.error)
        {
          toast.error(res.error || "Error in Updating Status")
          return
        }
        else
        {
          toast.success(res.message || "Status Updated Successfully")
          setIsRefresh(!isRefresh)
        }
      })
      .catch((error) => {
        console.error("Error updating status:", error);
        toast.error(error.message || "Error in updating status");
      });
  };

  const handleToggle = (ribbon) => {
    setToggleStates(ribbon);
    setIsConfirmModalOpen(true);
  };

   const handleBulkAction = async (action) => {
      if (action === "Active" || action === "Inactive") {
        let apiPayload = {
          _id: selectedRow,
          isDisable: action === "Active" ? false : true
        };
        try {
          const res = await dispatch(enableDisableRibbon(apiPayload)).unwrap();
          if (res) {
            toast.success(res?.message);
            setIsRefresh(!isRefresh)
            setSelectedRow([])
  
          }
        } catch (error) {
          toast.error(error?.message || error || "Failed...!");
          if (error.errors) {
            setErrors(error.errors);
          }
        }
      }
    };
  

  const handleEditClose = () => {
    setIsEditModal(false);
    setForm({
      _id: '',
      name: '',
      color: '#000000',
      bgColor: '#FFFFFF',
      isDisable: false
    });
    setErrors({});
  };

  const handleToggleStatus = () => {
    setForm(prev => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const reqData = {
      _id: formData._id,
      name: formData.name.trim(),
      color: formData.color,
      bgColor: formData.bgColor,
      isDisable: formData.isDisable
    };

    dispatch(updateRibbon(reqData))
      .unwrap()
      .then((res) => {
       if(res.error)
       {
        toast.error(res.error || "Error in Updating Ribbon")
        return
       }
       else
       {
        toast.success(res.message || "Ribbon Updated Successfully")
        setIsEditModal(false)
        setIsRefresh(!isRefresh)
       }
      })
      .catch((error) => {
        console.error("Error updating ribbon:", error);
        toast.error(error || "Error in updating ribbon");
      });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.map(ribbon => ribbon._id) || [];
      setSelectedRow(allIds);
    } else {
      setSelectedRow([]);
    }
  };

 const handleApplySearchFilters = () => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      searchFields: 'name',
      select: 'name color bgColor isDisable'
    };
     dispatch(getRibbonsList(reqData));
   }
  const handleSearchRemove = useCallback(() => {
    setFilters(prev => ({ ...prev, search: "" }));
      const reqData = {
       page: pageNo,
       size: size,
       keyWord: "",
       searchFields: 'name',
       select: 'name color bgColor isDisable'
     };
     dispatch(getRibbonsList(reqData));
     setIsRefresh(!isRefresh)
  }, [dispatch, size, isRefresh]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='max-w-7xl mx-auto'>
        <div className='overflow-hidden overflow-y-auto py-6'>
          <div className="flex justify-between items-center">
            <h3><Link to="/app/home" className='cursor-pointer'>Home</Link> / <b>Ribbons</b></h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => setIsOpenAddModal(true)}
            >
              Add Ribbon
            </AddButton>
          </div>
          <div className='overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
            <div className="max-w-auto mx-auto space-y-6">
              <div className="bg-white p-2">
                <div className="border-b mb-4">
                  <SearchComponent
                    isSearchShow={true}
                    filters={filters}
                    setFilters={setFilters}
                    isActionButton={true}
                    selectedRow={selectedRow}
                    setSelectedRow={setSelectedRow}
                    handleAction={handleBulkAction}
                    isStatusAction={true}
                    placeholder="Search by ribbon name"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                    totalData={totalItems}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading='Ribbons'
              tableHeadings={[
                "Image","Name", "Status", "Actions"]}
              data={tableRows}
              showSearch={true}
              placeholder='Search by name...'
              showFilter={false}
              showSummary={false}
              totalData={totalItems}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={handleSelectAllChange}
              allRowsSelected={selectedRow.length === (getListData?.length || 0) && getListData?.length > 0}
            />
          </div>
          <div className="flex justify-center my-6">
            {totalItems > 0 && Math.ceil(totalItems / size) > 1 && (
              <Pagination
                totalPages={Math.ceil(totalItems / size)}
                currentPage={pageNo}
                onPageChange={onPageChange}
              />
            )}
          </div>
        </div>

        {/* Add Ribbon Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Add Ribbon"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Ribbon Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              maxLength={50}
              required
              placeholder="Enter ribbon name"
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Text Color"
              name="color"
              type="color"
              value={formData.color}
              onChange={handleInputChange}
              error={errors.color}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Background Color"
              name="bgColor"
              type="color"
              value={formData.bgColor}
              onChange={handleInputChange}
              error={errors.bgColor}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3 mt-4'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton 
              isToggle={!formData.isDisable} 
              handleClick={handleToggleStatus} 
            />
          </div>
        </DefaultModal>

        {/* Edit Ribbon Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Ribbon"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Ribbon Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              maxLength={50}
              required
              placeholder="Enter ribbon name"
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Text Color"
              name="color"
              type="color"
              value={formData.color}
              onChange={handleInputChange}
              error={errors.color}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Background Color"
              name="bgColor"
              type="color"
              value={formData.bgColor}
              onChange={handleInputChange}
              error={errors.bgColor}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3 mt-4'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton 
              isToggle={!formData.isDisable} 
              handleClick={handleToggleStatus} 
            />
          </div>
        </DefaultModal>

        <DeletePopup
          isDeleteModalOpen={showDeleteConfirmation}
          closeDeleteModal={() => setShowDeleteConfirmation(false)}
          confirmDelete={confirmDelete}
          DeleteHeading={'Are you sure you want to delete this Ribbon?'}
        />

        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this Ribbon?`}
        />
      </div>
    </>
  )
}

export default Ribbons;