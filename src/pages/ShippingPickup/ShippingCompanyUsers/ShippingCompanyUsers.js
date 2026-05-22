/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import { showError, showSuccess } from '../../../Redux/alertSlice';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Button from '../../../components/Atoms/buttons/button';
import { create, enableDisable, getList, update } from '../../../Redux/userManagementSlice';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';

const AdminUsers = () => {
  const dispatch = useDispatch();
  const [isEditMode, setIsEditMode] = useState(false);
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    full_name: '',
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    isDisable: false
  });
  const [errors, setErrors] = useState({});
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const size = 10
  useEffect(() => {
    const reqData = {
      page: pageNo.toString(),
      size: size.toString(),
      keyWord: filters.search,
      searchFields: 'full_name',

    };
    dispatch(getList(reqData));
  }, [size, pageNo, dispatch, isRefresh, filters.search]);

  const selector = useSelector(state => state.user);
  const getListData = selector?.getListData?.data?.data;
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

  const [query, setQuery] = useState('');
  const validateAddUserForm = () => {
    const newErrors = {};
    let isValid = true;

    // Full name validation
    if (!formData?.full_name) {
      newErrors.full_name = 'Full name is required';
      isValid = false;
    } else if (formData?.full_name.length < 3) {
      newErrors.full_name = 'Full name must be at least 3 characters';
      isValid = false;
    }

    // Username validation
    if (!formData?.userName) {
      newErrors.userName = 'Username is required';
      isValid = false;
    } else if (formData?.userName.length < 5) {
      newErrors.userName = 'Username must be at least 5 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName)) {
      newErrors.userName = 'Username can only contain letters, numbers and underscores';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation (only for add mode)
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
        isValid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
        isValid = false;
      } else if (formData.password.length > 15) {
        newErrors.password = 'Password should be maximum 15 characters long';
        isValid = false;
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
        isValid = false;
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one lowercase letter';
        isValid = false;
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one number';
        isValid = false;
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one special character';
        isValid = false;
      }

      // Confirm password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
      console.log("error", newErrors)
    }

    setErrors(newErrors);
    return isValid;
  };


  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      full_name: '',
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
      isDisable: false
    });
    setErrors({});
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();

    if (!validateAddUserForm()) return;

    const reqData = {
      full_name: formData.full_name,
      userName: formData.userName,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      isDisable: formData.isDisable
    };

    dispatch(create(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          (toast.error(res.error));
          return

        } else {
          toast.success(res.message || "User created successfully");
          handleClose();
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.log("error", error)
        toast.error(error || "Error in creating user");
      });
  };
  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };
  const tableRows = getListData?.list?.map((user) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(user._id)}
      onChange={(e) => handleRowCheckboxChange(e, user._id)}
    />,
    <span key={`name-${user._id}`} className="capitalize">
      {user?.full_name}
    </span>,
    <span key={`username-${user._id}`}>
      {user?.userName}
    </span>,
    <span key={`email-${user._id}`}>
      {user?.email}
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
      <span
        className={`mt-1 capitalize ${!user?.isDisable ? "text-green-600" : "text-red-500"}`}
      >
        {!user?.isDisable ? "enabled" : "disabled"}
      </span>
    </div>,
    <span key={`actions-${user._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: user._id,
            full_name: user.full_name,
            userName: user.userName,
            email: user.email,
            isDisable: user.isDisable
          });
          setIsEditModal(true);
        }}
        showDeleteButton={false}
        showPasswordButton={false}
        showLinkButton={false}
      
      />
       {/* <AddEditShippingCompanyUsers
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      /> */}
      {/* <UserTransactionsSetup
        onCloseTransaction={() => setIsOpenTransaction(false)}
        isOpenTransaction={isOpenTransaction}
      /> */}
    </span>,
  ]);

  const confirmDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleDisableFunc = () => {

    if (!toggleStates) return;
    const obj = {
      _id: Array(toggleStates._id),
      isDisable: !toggleStates.isDisable
    };

    dispatch(enableDisable(obj))
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
        const res = await dispatch(enableDisable(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setIsRefresh(!isRefresh)
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
      full_name: '',
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
      isDisable: false
    });
    setErrors({});
  };

  // This does nothing functionally, as it sets the same value
  const handleToggleAdd = () => {
    setForm((prev) => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };
  const validateEditUserForm = () => {
    const newErrors = {};
    let isValid = true;

    // Full name validation
    if (!formData?.full_name) {
      newErrors.full_name = 'Full name is required';
      isValid = false;
    } else if (formData?.full_name.length < 3) {
      newErrors.full_name = 'Full name must be at least 3 characters';
      isValid = false;
    }

    // Username validation
    if (!formData?.userName) {
      newErrors.userName = 'Username is required';
      isValid = false;
    } else if (formData?.userName.length < 5) {
      newErrors.userName = 'Username must be at least 5 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName)) {
      newErrors.userName = 'Username can only contain letters, numbers and underscores';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.(com)$/.test(formData.email)) {
      newErrors.email = 'Email must be a valid .com address';
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
        full_name: formData.full_name,
        // userName: formData.userName,
        email: formData.email,
        isDisable: formData.isDisable
      };

      dispatch(update(reqData))
        .unwrap()
        .then((res) => {
          if (res.error) {
            dispatch(showError(res.error));
          } else {
            dispatch(showSuccess(res.message || "User Updated Successfully"));
            setIsEditModal(false);
            setIsRefresh(!isRefresh);
          }
        })
        .catch((error) => {
          dispatch(showError(error.message || "Error in Updating User"));
        });
    };
    const handleSelectAllChange = (e) => {
      if (e.target.checked) {
        const allIds = getListData?.list?.map(user => user._id) || [];
        setSelectedRow(allIds);
      } else {
        setSelectedRow([]);
      }
    };
    return (
      <>
        <Loader loading={selector.loading} />
        <div className='max-w-7xl mx-auto'>
          <div className=' overflow-hidden overflow-y-auto py-6'>
            <div className="flex justify-between items-center">
              <h3>Home / <b>Admin Users</b></h3>
              <Button
                className="border-[#3E4094] text-[#3E4094] mb-3"
                onClick={() => {
                  setIsOpenAddModal(true);
                }}
              >
                Add User
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
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search By Full Name"

                    />
                  </div>
                </div>
              </div>
              <TableData
                Heading='Admin Users'
                tableHeadings={[
                  <input
                    type="checkbox"
                    checked={selectedRow.length > 0 && selectedRow.length === (getListData?.list?.length || 0)}
                    onChange={handleSelectAllChange}
                    // Indeterminate state when some but not all are selected
                    ref={el => {
                      if (el) {
                        el.indeterminate =
                          selectedRow.length > 0 &&
                          selectedRow.length < (getListData?.list?.length || 0);
                      }
                    }}
                  />, "Full Name", "Username", "Email", "Status", "Actions"]}
                data={tableRows}
                showSearch={true}
                placeholder='Search by...'
                showFilter={false}
                showSummary={false}
                onClickFunction={() => {
                  setIsEditMode(false);
                  setIsOpen(true);
                }}
                totalData={totalUsers}
                totalSize={size}
                currentPage={pageNo}
                onPageChange={onPageChange}
                searchTerm={keyword}
                setSearchTerm={setKeyword}
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
            title="Admin User Setup"
            titleClassName="mt-5 font-medium"
          >
            <div className='p-4 flex space-x-4'>
              <div className="w-1/2">
                <FormInput
                  label="Full Name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  error={errors.full_name}
                  maxLength={50}
                  required
                />
              </div>
              <div className="w-1/2">
                <FormInput
                  label="Username"
                  name="userName"
                  type="text"
                  value={formData.userName}
                  onChange={handleInputChange}
                  error={errors.userName}
                  maxLength={30}
                  required
                />
              </div>
            </div>
            <div className='p-4'>
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                maxLength={50}
                required
              />
            </div>
            <div className='p-4 flex space-x-4'>
              <div className="w-1/2">
                <FormInput
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  maxLength={15}
                  required
                />
              </div>
              <div className="w-1/2">
                <FormInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
                  maxLength={15}
                  required
                />
              </div>
            </div>
            {/* <div className='p-4'>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div> */}
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
            title="Edit Admin User"
            titleClassName="mt-5 font-medium"
          >
            <div className='p-4 flex space-x-4'>
              <div className="w-1/2">
                <FormInput
                  label="Full Name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  error={errors.full_name}
                  maxLength={50}
                  required
                />
              </div>
              <div className="w-1/2">
                <FormInput
                  label="Username"
                  name="userName"
                  type="text"
                  value={formData.userName}
                  onChange={handleInputChange}
                  error={errors.userName}
                  maxLength={30}
                  required
                  disabled
                />
              </div>
            </div>
            <div className='p-4'>
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                maxLength={50}
                required
              />
            </div>
            <div className='flex justify-between items-center border p-3'>
              <p className="font-medium text-sm">Status</p>
              <ToggleButton isToggle={!formData.isDisable} handleClick={handleToggleAdd} />
            </div>
          </DefaultModal>

          <DeletePopup
            isDeleteModalOpen={showDeleteConfirmation}
            closeDeleteModal={() => setShowDeleteConfirmation(false)}
            confirmDelete={confirmDelete}
            DeleteHeading={'Are you sure you want to delete this user?'}
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

  export default AdminUsers