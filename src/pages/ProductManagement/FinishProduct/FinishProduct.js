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
import { CreateFinish, enableDisableFinish, FinishGetList, softDeleteFinish, updateFinish } from '../../../Redux/productSlice';
import AddButton from '../../../components/Button/AddButton';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';

const FinishProducts = () => {
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

  const size = 10

  useEffect(() => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      searchFields: 'name',
      select: 'name isDisable'
    };
    dispatch(FinishGetList(reqData));
  }, [size, pageNo, isRefresh]);

  const selector = useSelector(state => state.product);
  const getListData = selector?.FinishGetListData?.data?.data?.list;
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
    else if (formData?.name.length >100) {
      newErrors.name = 'Maximum Name Characters length must be 100';
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
      isDisable: formData.isDisable
    };

    dispatch(CreateFinish(reqData))
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
    <CustomCheckbox
      key={`checkbox-${user._id}`}
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
        <ToggleButton
          key={`toggle-${user._id}`}
          isToggle={!user?.isDisable}
          handleClick={() => handleToggle(user)}
        />
        {/* <div
          onClick={() => handleToggle(user)}
          className="cursor-pointer w-9 h-5 bg-gray-200 hover:bg-red-600 peer-focus:outline-0 peer-focus:ring-transparent rounded-full peer transition-all ease-in-out duration-500 peer-checked:after:translate-x-full peer-checked:after:border-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-blue-600 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-400 hover:peer-checked:bg-green-200"
          title="Enable/Disable"
        ></div> */}
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
          setDeleteData({ _id: Array(user._id) })
          setShowDeleteConfirmation(true)
        }}
        showLinkButton={false}
      />
    </span>,
  ]);

  const confirmDelete = () => {
    dispatch(softDeleteFinish(deleteData)).unwrap()
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
      _id: Array(toggleStates._id),
      isDisable: !toggleStates.isDisable
    };

    dispatch(enableDisableFinish(obj))
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
        toast.error(error.message || "Error in Updating Status");
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
        const res = await dispatch(enableDisableFinish(apiPayload)).unwrap();
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
      name: formData.name,
      isDisable: formData.isDisable,
    };

    dispatch(updateFinish(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Finish Updated Successfully");
          setIsEditModal(false);
          setForm({
            name: "",
            isDisable: false
          })
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        toast.error(error.message || "Error in Updating Finish");
      });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.map(user => user._id) || [];
      setSelectedRow(e.target.checked ? allIds : []);
    } else {
      setSelectedRow([]);
    }
  };
  // const handleHeaderCheckboxChange = useCallback((e) => {

  //   setSelectedRow(e.target.checked ? getAllRowIds : []);
  // }, [getAllRowIds]);
  const handleApplySearchFilters = () => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      searchFields: 'name',
      select: 'name isDisable'
    };
    dispatch(FinishGetList(reqData));
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
            <h3>Home / <b>Finish</b></h3>
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
                    placeholder="Search By Full Name"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                    totalData={selector?.FinishGetListData?.data?.data?.total}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading='Admin Users'
              tableHeadings={[
                "Full Name", "Status", "Actions"]}
              data={tableRows}
              showSearch={true}
              placeholder='Search by...'
              showFilter={false}
              showSummary={false}
              totalData={selector?.FinishGetListData?.data?.data?.total}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={handleSelectAllChange}
              allRowsSelected={selectedRow.length === selector?.FinishGetListData?.data?.data?.list?.length}


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

        {/* Add User Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddUserSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Reset"
          title="Add Finish Products"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4 flex space-x-4'>
            <div className="w-full">
              <Input
                labelName="User Name"
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
          title="Edit Finish Product"
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

export default FinishProducts