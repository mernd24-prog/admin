/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Button from '../../../components/Atoms/buttons/button';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import { createDimension, enableDisableDimension, getListDimension, softDeleteDimension, updateDimension } from '../../../Redux/productSlice';
import Input from '../../../components/Atoms/Input/Input';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
const ProductDimensions = () => {
  const dispatch = useDispatch();
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    dimensions_value: '',
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
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const size = 10;

  useEffect(() => {
    const reqData = {
      page: pageNo.toString(),
      size: size.toString(),
      keyWord: filters.search,
      searchFields: 'dimensions_value',
      select: 'dimensions_value isDisable'
    };
    dispatch(getListDimension(reqData));
  }, [size, pageNo, dispatch, isRefresh]);

  const selector = useSelector(state => state.product);
  const getListData = selector?.getListDimensionData?.data?.data;
  const totalUsers = getListData?.total || 0;

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

  const validateAddForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.dimensions_value || formData.dimensions_value.trim() === '') {
      newErrors.dimensions_value = 'Dimension value is required';
      isValid = false;
    } else if (formData.dimensions_value.trim().length < 2) {
      newErrors.dimensions_value = 'Dimension must be at least 2 characters';
      isValid = false;
    } else if (formData.dimensions_value.trim().length > 50) {
      newErrors.dimensions_value = 'Dimension must be less than 50 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(formData.dimensions_value.trim())) {
      newErrors.dimensions_value = 'Dimension must not contain special characters';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      dimensions_value: "",
      isDisable: false
    });
    setErrors({});
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();

    if (!validateAddForm()) return;

    const reqData = {
      dimensions_value: formData.dimensions_value.trim(),
      isDisable: formData.isDisable
    };

    dispatch(createDimension(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        } else {
          toast.success(res.message || "Dimension created successfully");
          handleClose();
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error creating dimension:", error);
        toast.error(error || "Error in creating dimension");
      });
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  const tableRows = getListData?.list?.map((dimension) => [
    // <input
    //   type='checkbox'
    //   checked={selectedRow.includes(dimension._id)}
    //   onChange={(e) => handleRowCheckboxChange(e, dimension._id)}
    //   key={`checkbox-${dimension._id}`}
    // />
    <CustomCheckbox
      key={`checkbox-${dimension._id}`}
      checked={selectedRow.includes(dimension._id)}
      onChange={(e) => handleRowCheckboxChange(e, dimension._id)}
    />,

    <span key={`name-${dimension._id}`} className="capitalize">
      {dimension?.dimensions_value}
    </span>,
    <div className='flex flex-col'>
          <ToggleButton isToggle={!dimension?.isDisable} handleClick={() => handleToggle(dimension)} />

        </div>,
    <span key={`actions-${dimension._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: dimension._id,
            dimensions_value: dimension.dimensions_value,
            isDisable: dimension.isDisable
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [dimension._id] });
          setShowDeleteConfirmation(true);
        }}
        showPasswordButton={false}
        showLinkButton={false}
      />
    </span>,
  ]);

  const confirmDelete = () => {
    dispatch(softDeleteDimension(deleteData)).unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(res.message || "Dimension Deleted Successfully");
        setShowDeleteConfirmation(false);
        setIsRefresh(!isRefresh);
      }).catch((error) => {
        console.error("Error deleting dimension:", error);
        toast.error(error.message || "Error in Deleting Dimension");
      });
  };

  const handleDisableFunc = () => {
    if (!toggleStates) return;
    const obj = {
      _id: [toggleStates._id],
      isDisable: !toggleStates.isDisable
    };

    dispatch(enableDisableDimension(obj))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Status Updated Successfully");
          setIsConfirmModalOpen(false);
          setToggleStates(null);
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error updating status:", error);
        toast.error(error.message || "Error in Updating Status");
      });
  };

  const handleToggle = (dimension) => {
    setToggleStates(dimension);
    setIsConfirmModalOpen(true);
  };

  const handleBulkAction = async (action) => {
    if (!selectedRow.length) {
      toast.warning("Please select at least one dimension");
      return;
    }

    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true
      };
      try {
        const res = await dispatch(enableDisableDimension(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setIsRefresh(!isRefresh);
          setSelectedRow([]);
        }
      } catch (error) {
        console.error("Bulk action error:", error);
        toast.error(error?.message || error || "Failed to perform bulk action");
      }
    } else if (action === "Delete") {
      setDeleteData({ _id: selectedRow });
      setShowDeleteConfirmation(true);
    }
  };

  const handleEditClose = () => {
    setIsEditModal(false);
    setForm({
      dimensions_value: '',
      isDisable: false
    });
    setErrors({});
  };

  const handleToggleAdd = () => {
    setForm(prev => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!validateAddForm()) return;

    const reqData = {
      _id: formData._id,
      dimensions_value: formData.dimensions_value.trim(),
      isDisable: formData.isDisable
    };

    dispatch(updateDimension(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Dimension Updated Successfully");
          setIsEditModal(false);
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error updating dimension:", error);
        toast.error(error.message || "Error in Updating Dimension");
      });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.list?.map(dimension => dimension._id) || [];
      setSelectedRow(allIds);
    } else {
      setSelectedRow([]);
    }
  };
  const handleApplySearchFilters=()=>{
    const reqData = {
      page: pageNo.toString(),
      size: size.toString(),
      keyWord: filters.search,
      searchFields: 'dimensions_value',
      select: 'dimensions_value isDisable'
    };
    dispatch(getListDimension(reqData));
    setIsRefresh(!isRefresh)

  }
  const handleSearchRemove = useCallback(() => {
    setFilters(prev => ({ ...prev, search: "" }));
    setKeyword("");
    setPageNo(1);
    setIsRefresh(!isRefresh)
  }, [dispatch, size, isRefresh]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='max-w-7xl mx-auto'>
        <div className=' overflow-hidden overflow-y-auto py-6'>
          <div className="flex justify-between items-center">
            <h3>Home / <b>Product Dimensions</b></h3>
            <Button
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => {
                setIsOpenAddModal(true);
              }}
            >
              Add Dimension
            </Button>
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
                    isDelete={true}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search By Dimension Value"
                     handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading='Product Dimensions'
              tableHeadings={[
                "Dimension Value",
                "Status",
                "Actions"
              ]}
              data={tableRows}
              showSearch={true}
              placeholder='Search by dimension...'
              showFilter={false}
              showSummary={false}
              onClickFunction={() => {
                // setIsEditMode(false);

              }}
              totalData={totalUsers}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={handleSelectAllChange}
              allRowsSelected={selectedRow.length === selector?.getListData?.data?.data?.list?.length}
            />
          </div>
          <div className="flex justify-center my-6">
            {getListData?.total && size && Math.ceil(getListData.total / size) > 1 && (
              <Pagination
                totalPages={Math.ceil(getListData.total / size)}
                currentPage={pageNo}
                onPageChange={onPageChange}
              />
            )}
          </div>
        </div>

        {/* Add Dimension Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Add New Dimension"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4'>
            <Input
              labelName="Dimension Value"
              name="dimensions_value"
              type="text"
              value={formData.dimensions_value}
              onChange={handleInputChange}
              error={errors.dimensions_value}
              maxLength={50}
              required
              onInput={(e) => {
                let val = e.target.value;
                val = val.replace(/^\s+/, '');
                val = val.replace(/[^a-zA-Z0-9\s-]/g, '');
                if (val.length > 50) {
                  val = val.slice(0, 50);
                }
                e.target.value = val;
              }}
            />

          </div>
          <div className='flex justify-between items-center border p-3'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div>
        </DefaultModal>

        {/* Edit Dimension Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Dimension"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4'>
            <FormInput
              label="Dimension Value"
              name="dimensions_value"
              type="text"
              value={formData.dimensions_value}
              onChange={handleInputChange}
              error={errors.dimensions_value}
              maxLength={50}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div>
        </DefaultModal>

        <DeletePopup
          isDeleteModalOpen={showDeleteConfirmation}
          closeDeleteModal={() => setShowDeleteConfirmation(false)}
          confirmDelete={confirmDelete}
          DeleteHeading={'Are you sure you want to delete this dimension?'}
        />

        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this dimension?`}
        />
      </div>
    </>
  )
}

export default ProductDimensions