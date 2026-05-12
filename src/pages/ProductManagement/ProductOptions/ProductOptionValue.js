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
import { createProductOption, deleteProductOption, enableDisableProductOption, getListProductOption, updateProductOption, } from '../../../Redux/productSlice';
import AddButton from '../../../components/Button/AddButton';
import { useParams } from 'react-router-dom';
const ProductOptionValue = () => {
  const dispatch = useDispatch();
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    _id: '',
    name: '',
    isDisable: false
  });
  const [errors, setErrors] = useState({});
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [deleteData, setDeleteData] = useState("")
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const { id } = useParams()
  const size = 10

  useEffect(() => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      option_id: id,
      searchFields: 'name',
      select: 'name isDisable'
    };
    dispatch(getListProductOption(reqData));
  }, [size, pageNo, isRefresh, id]);

  const selector = useSelector(state => state.product);
  const listResponse = selector?.getListProductOptionData?.data?.data || {};
  const getListData = listResponse?.list || [];

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
  const validateAddUserForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.name) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData?.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      name: "",
      isDisable: false
    });
    setErrors({});
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();

    if (!validateAddUserForm()) return;

    const reqData = {
      name: formData.name,
      isDisable: formData.isDisable,
      option_id: id
    };

    dispatch(createProductOption(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return
        } else {
          toast.success(res.message || "Item created successfully");
          handleClose();
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.log("error", error)
        toast.error(error || "Error in creating Item");
      });
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  const tableRows = getListData?.map((user) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(user._id)}
      onChange={(e) => handleRowCheckboxChange(e, user._id)}
    />,
    <span key={`name-${user._id}`} className="capitalize">
      {user?.name}
    </span>,
    <div key={`status-${user._id}`} className="flex flex-col">
      <label className="relative inline-flex" title="Enable/Disable">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={!user?.isDisable}
          readOnly
        />
        <div
          onClick={() => handleToggle(user)}
          className="cursor-pointer w-9 h-5 bg-gray-200 hover:bg-red-600 peer-focus:outline-0 peer-focus:ring-transparent rounded-full peer transition-all ease-in-out duration-500 peer-checked:after:translate-x-full peer-checked:after:border-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-blue-600 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-400 hover:peer-checked:bg-green-200"
          title="Enable/Disable"
        ></div>
      </label>
    </div>,
    <span key={`actions-${user._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: user._id,
            name: user.name,
            isDisable: user.isDisable
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [user._id] })
          setShowDeleteConfirmation(true)
        }}
        showLinkButton={false}
      />
    </span>,
  ]);

  const confirmDelete = () => {
    dispatch(deleteProductOption(deleteData)).unwrap()
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

    dispatch(enableDisableProductOption(obj))
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
        console.log("error", error);
        toast.error(error || "Error in Updating Status");
      });
  };

  const handleToggle = (user) => {
    setToggleStates(user);
    setIsConfirmModalOpen(true);
  };

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true
      };
      try {
        const res = await dispatch(enableDisableProductOption(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setIsRefresh(!isRefresh)
          setSelectedRow([]);
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

  const validateEditUserForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.name) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData?.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  }

  const handleEditUserSubmit = (e) => {
    e.preventDefault();

    if (!validateEditUserForm()) return;

    const reqData = {
      _id: formData._id,
      option_id: id,
      name: formData.name,
      isDisable: formData.isDisable,
    };

    dispatch(updateProductOption(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Product Option Updated Successfully");
          setIsEditModal(false);
          setForm({
            name: "",
            isDisable: false
          })
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        toast.error(error.message || "Error in Updating Product Option");
      });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.map(user => user._id) || [];
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
      option_id: id,
      searchFields: 'name',
      select: 'name isDisable'
    };
    dispatch(getListProductOption(reqData));
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
            <h3>Home / <b>Product Options</b></h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => {
                setIsOpenAddModal(true);
              }}
            >
              Add
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
                    placeholder="Search By Option Name"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading='Admin Users'
              tableHeadings={[
                <input
                  type="checkbox"
                  checked={selectedRow.length > 0 && selectedRow.length === (getListData?.length || 0)}
                  onChange={handleSelectAllChange}
                  ref={el => {
                    if (el) {
                      el.indeterminate =
                        selectedRow.length > 0 &&
                        selectedRow.length < (getListData?.length || 0);
                    }
                  }}
                />, "Option Name", "Status", "Actions"]}
              data={tableRows}
              showSearch={true}
              placeholder='Search by...'
              showFilter={false}
              showSummary={false}
              totalData={listResponse?.total || 0}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
            />
          </div>
          <div className="flex justify-center my-6">
            {listResponse?.total && size && Math.ceil(listResponse.total / size) > 1 && (
              <Pagination
                totalPages={Math.ceil(listResponse.total / size)}
                currentPage={pageNo}
                onPageChange={onPageChange}
              />
            )}
          </div>
        </div>

        {/* Add User Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddUserSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Reset"
          title="Add Product Option Value"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4 flex space-x-4'>
            <div className="w-full">
              <Input
                labelName="Product Option Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                maxLength={50}
                required
              />
            </div>
          </div>

          <div className='flex justify-between items-center border p-3'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton isToggle={!formData.isDisable} handleClick={handleToggleAdd} />
          </div>
        </DefaultModal>

        {/* Edit User Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditUserSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Product Option Value"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4'>
            <div className="w-full">
              <Input
                labelName="Name"
                name="name"
                type="text"
                placeholder="Enter Name"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                maxLength={50}
                required
              />
            </div>
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
          DeleteHeading={'Are you sure you want to delete the Item?'}
        />

        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this user?`}
        />
      </div>
    </>
  )
}

export default ProductOptionValue
