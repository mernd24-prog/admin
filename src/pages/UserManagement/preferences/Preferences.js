/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup'
import { useDispatch } from 'react-redux'
import {
  createInterest,
  deleteInterest,
  enableDisableInterest,
  getInterestListData,
  updateInterest,
} from '../../../Redux/adminSlice'
import { showError, showSuccess } from '../../../Redux/alertSlice'
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup'
// import AddEditInterest from './components/AddEditInterest'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import AddButton from '../../../components/Button/AddButton'
import { toast } from 'sonner'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
const size = 10
const Preferences = () => {
  const dispatch = useDispatch()
  const [apiRes, setApiRes] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [toggleStates, setToggleStates] = useState({})
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedInterestToDelete, setSelectedInterestToDelete] = useState('')
  // const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "" });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);



  const onPageChange = newPageNo => {
    setPage(newPageNo)
  }
  const [formData, setFormData] = useState({
    name: '',
    isDisable: false
  })

  const [errors, setErrors] = useState({})

  const getInterestList = () => {
    let query = {
      // page: page,
      // size: size,
      // select: 'name,status',
      // keyWord: keyword,
      // searchFields: ''
      page: 1,
      size: 20,
      keyWord: "",
      sortBy: "createdAt",
      sortOrder: "desc"
    }

    dispatch(getInterestListData(query))
      .then(res => {
        setApiRes(res?.payload?.data || [])
        // console.log("getInterestList", res?.payload?.data?.list)
      })
      .catch(err => {
        console.log('Error', err)
      })
  }
  useEffect(() => {
    getInterestList(page, size, keyword)
  }, [page, size, keyword,isRefresh])

  const handleInputChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const closeModal = () => {
    // setIsOpen(false)
    setIsEditMode(false)
    setFormData({
      name: ''
    })
    setErrors({})
  }

  const handleDisableFunc = () => {
    console.log("toggleStates", toggleStates)
    if (!toggleStates) return;

    const obj = {
      _id: [toggleStates._id],
      isDisable: !toggleStates.isDisable
    };

    dispatch(enableDisableInterest(obj))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Status Updated Successfully");
          setIsConfirmModalOpen(false);
          setToggleStates(null);
          getInterestList()
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error updating status:", error);
        toast.error(error.message || "Error in Updating Status");
      });
  };
  const handleToggle = ter => {
    console.log("ter", ter)

    setToggleStates(ter)
    // setIsConfirmModalOpen(true)
  }



  const handleSearchRemove = useCallback(() => {
    setFilters(prev => ({ ...prev, search: "" }));
    setKeyword("");
    setPage(1);
    setIsRefresh(!isRefresh)
    getInterestList()
  }, [dispatch, size, isRefresh]);


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
        const res = await dispatch(enableDisableInterest(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setIsRefresh(!isRefresh);
          setSelectedRow([]);
          getInterestList()
        }
      } catch (error) {
        console.error("Bulk action error:", error);
        toast.error(error?.message || error || "Failed to perform bulk action");
      }
    } else if (action === "Delete") {
      setSelectedInterestToDelete({ _id: selectedRow });
      setShowDeleteConfirmation(true);
      setSelectedRow([])
      getInterestList()
      setIsRefresh(!isRefresh)
    }
  };

  const handleApplySearchFilters = () => {
    const reqData = {
      page: page.toString(),
      size: size.toString(),
      keyWord: filters.search,
      searchFields: 'name',
      select: 'name isDisable',
    };

    // console.log("handleApplySearchFilters is called")

    dispatch(getInterestListData(reqData)).then(res => {
      setApiRes(res?.payload?.data || [])
      // console.log("getInterestList", res?.payload?.data?.list)
    })
      .catch(err => {
        console.log('Error', err)
      })
    setIsRefresh(!isRefresh);
  };




  // console.log("apiRes", apiRes)

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };


  const tableRows =
    Array.isArray(apiRes?.list) &&
    apiRes?.list?.map((ele, index) => {
      return [
        <input
          type='checkbox'
          className='w-4 h-4 border border-[#4a4a4f] rounded bg-transparent peer-checked:bg-[#0055ff] peer-checked:border-[#0055ff] transition-all duration-300'
          checked={selectedRow.includes(ele._id)}
          onChange={(e) => handleRowCheckboxChange(e, ele._id)}
          key={`checkbox-${ele._id}`}
        />,
        <span className='capitalize'>
          {ele?.name}
        </span>,
        
        <ToggleButton
          key={`toggle-${ele._id}`}
          isToggle={!ele.isDisable}
          handleClick={() => {
            handleToggle(ele);
            handleDisableFunc();
          }}

        />,

        <span>
          <ActionButtons
            onEdit={() => {
              setFormData({ name: ele.name, _id: ele._id, isDisable: ele.isDisable })
              setIsEditMode(true)
              setIsEditModal(true)
              // setIsOpen(true)
            }}
            onDelete={() => {
              setSelectedInterestToDelete({ _id: [ele._id] });
              setShowDeleteConfirmation(true);

            }}

            showLinkButton={false}
          />
        </span>
      ]
    })





  const confirmDelete = async () => {

    try {
      const result = await dispatch(
        deleteInterest(selectedInterestToDelete)
      );

      if (result?.payload?.error) {
        dispatch(showError(result?.payload?.message));
      } else {
        dispatch(showSuccess(result?.payload?.message));
        setShowDeleteConfirmation(false);
        getInterestList();
      }
    } catch (error) {
      console.error('Error deleting interest:', error);
      dispatch(
        showError(
          'An unexpected error occurred while deleting the interest.'
        )
      );
    } finally {
      setShowDeleteConfirmation(false);
    }
  };


  const handleClose = () => {
    setIsOpenAddModal(false);
    setFormData({
      name: "",
      isDisable: false
    });
    setErrors({});
  };


  const validateAddForm = () => {
    const newErrors = {};
    let isValid = true;

    if (formData.name === '') {
      newErrors.name = 'Interest Name Is required'
      isValid = false;
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(formData.name)) {
      newErrors.name = 'Interest Name must not contain special characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };


  const handleAddSubmit = (e) => {
    e.preventDefault();

    if (!validateAddForm()) return;

    const reqData = {
      name: formData.name,
      isDisable: formData.isDisable
    };

    dispatch(createInterest(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        } else {
          toast.success(res.message || "Interest created successfully");
          getInterestList()
          handleClose();
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error creating Interest:", error);
        toast.error(error || "Error in creating interest");
      });
  };

  const handleToggleAdd = () => {
    setFormData(prev => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  const handleEditClose = () => {
    setIsEditModal(false);
    setFormData({
      name: '',
      isDisable: false
    });
    setErrors({});
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!validateAddForm()) return;

    const reqData = {
      _id: formData._id,
      name: formData.name,
      isDisable: formData.isDisable
    };

    console.log("reqData", reqData)
    console.log("formData", formData)

    dispatch(updateInterest(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Interest Updated Successfully");
          setIsEditModal(false);
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        console.error("Error updating interest:", error);
        toast.error(error || "Error in Updating Interest");
      });
  };


  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = apiRes?.list?.map(dimension => dimension._id) || [];
      setSelectedRow(allIds);
    } else {
      setSelectedRow([]);
    }
  };

  return (
    <>
      <div className='max-w-7xl mx-auto'>
        <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
          <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
            <div className="flex justify-between items-center">
              <h3>Home / <b>Preferences</b></h3>
              <AddButton
                className="border-[#3E4094] text-[#3E4094] mb-3"
                onClick={() => {
                  setIsOpenAddModal(true);
                }}
              >
                Add
              </AddButton>
            </div>

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
                    placeholder="Search By Preference Name..."
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>

            <TableData
              Heading='Manage Interest'
              tableHeadings={[
                <input
                  type="checkbox"
                  className='w-4 h-4 border border-[#4a4a4f] rounded bg-transparent peer-checked:bg-[#0055ff] peer-checked:border-[#0055ff] transition-all duration-300'
                  checked={selectedRow.length > 0 && selectedRow.length === apiRes.list.length}
                  onChange={handleSelectAllChange}
                  ref={el => {
                    if (el) {
                      if (selectedRow.length > 0 && selectedRow.length < apiRes.list.length) {
                        el.indeterminate = false; // show minus
                      } else {
                        el.indeterminate = false; // no minus
                      }
                    }
                  }}
                  key="select-all"
                />,



                "Name",
                "Status",
                "Actions"
              ]}

              data={tableRows}
              showSearch={true}
              placeholder='Search by...'
              showFilter={false}
              showSummary={false}
              showAddButton={true}
              addButtonLabel='Add'
              onClickFunction={() => {
                setIsEditMode(setIsEditMode)
                // setIsOpen(setIsOpen)
              }}
              totalData={apiRes?.total}
              totalSize={size}
              currentPage={page}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}

            />
          </div>
        </div>

        {/* add interest modal */}

        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Add New Preference"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4'>
            <Input
              labelName="Preference Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter Preferences Name"
              error={errors.name}
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


        {/* Edit Interest Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Preference"
          titleClassName="mt-5 font-medium"
        >
          <div className='p-4'>
            <Input
              labelName="Preference Name"
              name="name"
              type="text"
              placeholder="Enter Preference Name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
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

        {/* delete popup */}
        <DeletePopup
          isDeleteModalOpen={showDeleteConfirmation}
          closeDeleteModal={() => { setShowDeleteConfirmation(false); setSelectedInterestToDelete('') }}
          confirmDelete={confirmDelete}
          DeleteHeading={'Are you sure you want to delete?'}
        />
      </div>
    </>
  )
}

export default Preferences
