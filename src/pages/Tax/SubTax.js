/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
// import { createSubTax, enableDisableSubTax, getListSubTax, softDeleteSubTax, updateSubTax } from '../../../Redux/cmsSlice';
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import DeletePopup from "../../components/Atoms/DeletePopup.js/DeletePopup";
import StatusPopup from "../../components/Atoms/PopupData/StatusPopup";
import Pagination from "../../components/Pagination/Pagination";
import Input from "../../components/Atoms/Input/Input";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import Loader from "../../components/Loader/Loader";
import AddButton from "../../components/Button/AddButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import {
  createSubTax,
  enableDisableSubTax,
  getListSubTax,
  getTaxList,
  softDeleteSubTax,
  updateSubTax,
} from "../../Redux/cmsSlice";

const SubTax = () => {
  const dispatch = useDispatch();
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    _id: "",
    name: "",
    percentage: "",
    taxId: "",
    isDisable: false,
  });
  const [errors, setErrors] = useState({});
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [deleteData, setDeleteData] = useState("");
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const { id } = useParams();
  const size = 10;

  useEffect(() => {
    dispatch(getTaxList({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    const reqData = {
      page: pageNo,
      size: size,
      keyWord: filters.search,
      searchFields: "name",
      select: "name percentage isDisable",
      ...(id ? { taxId: id } : {}),
    };
    dispatch(getListSubTax(reqData));
  }, [size, pageNo, isRefresh, id, filters.search, dispatch]);

  const selector = useSelector((state) => state.cms);
  const getListData = selector?.getListSubTaxData?.data?.data?.list;
  const totalUsers = selector?.getListSubTaxData?.data?.data?.total || 0;
  const taxList = selector?.getTaxListData?.data?.data?.list || [];
  const taxOptions = useMemo(
    () => taxList.map((tax) => ({ value: tax._id || tax.id, label: tax.name })),
    [taxList],
  );
  const selectedTaxOption =
    taxOptions.find(
      (tax) => String(tax.value) === String(formData.taxId || id || ""),
    ) || null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateAddUserForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.name) {
      newErrors.name = "Name is required";
      isValid = false;
    } else if (formData?.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters";
      isValid = false;
    } else if (formData?.name.length > 100) {
      newErrors.name = "Maximum Name Character Length Should be 100";
      isValid = false;
    }
    if (!formData?.percentage) {
      newErrors.percentage = "Percentage is required";
      isValid = false;
    } else if (isNaN(formData.percentage)) {
      newErrors.percentage = "Percentage must be a number";
      isValid = false;
    } else if (
      parseFloat(formData.percentage) < 0 ||
      parseFloat(formData.percentage) > 100
    ) {
      newErrors.percentage = "Percentage must be between 0 and 100";
      isValid = false;
    }
    if (!id && !formData.taxId) {
      newErrors.taxId = "Tax is required";
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      _id: "",
      name: "",
      percentage: "",
      taxId: "",
      isDisable: false,
    });
    setErrors({});
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();

    if (!validateAddUserForm()) return;

    const reqData = {
      name: formData.name,
      percentage: formData.percentage,
      taxId: id || formData.taxId,
      isDisable: formData.isDisable,
    };

    dispatch(createSubTax(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        } else {
          toast.success(res.message || "Sub Tax created successfully");
          handleClose();
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        toast.error(error || "Error in creating Sub Tax");
      });
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const tableRows = getListData?.map((user) => [
    <CustomCheckbox
      key={`checkbox-${user._id}`}
      checked={selectedRow.includes(user._id)}
      onChange={(e) => handleRowCheckboxChange(e, user._id)}
    />,
    <span key={`name-${user._id}`} className="capitalize">
      {user?.name}
    </span>,
    <span key={`percentage-${user._id}`}>{user?.percentage}%</span>,
    <div className="flex flex-col">
      <ToggleButton
        isToggle={isRowActive(user)}
        handleClick={() => handleToggle(user)}
      />
    </div>,
    <span key={`actions-${user._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: user._id,
            name: user.name,
            percentage: user.percentage,
            taxId:
              user.taxId?._id ||
              user.tax_id?._id ||
              user.taxId ||
              user.tax_id ||
              id ||
              "",
            isDisable: !isRowActive(user),
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [user._id] });
          setShowDeleteConfirmation(true);
        }}
        showLinkButton={false}
      />
    </span>,
  ]);

  const confirmDelete = () => {
    dispatch(softDeleteSubTax(deleteData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          return;
        } else {
          toast.success(res.message || "Sub Tax Deleted Successfully");
          setShowDeleteConfirmation(false);
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        toast.error(error || "Error in Deleting Sub Tax");
      });
  };

  const handleDisableFunc = () => {
    if (!toggleStates) return;
    const obj = {
      _id: [toggleStates._id],
      isDisable: isRowActive(toggleStates),
    };

    dispatch(enableDisableSubTax(obj))
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
        isDisable: action === "Active" ? false : true,
      };
      try {
        const res = await dispatch(enableDisableSubTax(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setIsRefresh(!isRefresh);
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
      _id: "",
      name: "",
      percentage: "",
      taxId: "",
      isDisable: false,
    });
    setErrors({});
  };

  const handleToggleAdd = () => {
    setForm((prev) => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  const validateEditUserForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.name) {
      newErrors.name = "Name is required";
      isValid = false;
    } else if (formData?.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters";
      isValid = false;
    }
    if (!formData?.percentage) {
      newErrors.percentage = "Percentage is required";
      isValid = false;
    } else if (isNaN(formData.percentage)) {
      newErrors.percentage = "Percentage must be a number";
      isValid = false;
    } else if (
      parseFloat(formData.percentage) < 0 ||
      parseFloat(formData.percentage) > 100
    ) {
      newErrors.percentage = "Percentage must be between 0 and 100";
      isValid = false;
    }
    if (!id && !formData.taxId) {
      newErrors.taxId = "Tax is required";
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();

    if (!validateEditUserForm()) return;

    const reqData = {
      _id: formData._id,
      name: formData.name,
      percentage: formData.percentage,
      isDisable: formData.isDisable,
      taxId: id || formData.taxId,
    };

    dispatch(updateSubTax(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(res.message || "Sub Tax Updated Successfully");
          setIsEditModal(false);
          setForm({
            _id: "",
            name: "",
            percentage: "",
            taxId: "",
            isDisable: false,
          });
          setIsRefresh(!isRefresh);
        }
      })
      .catch((error) => {
        toast.error(error.message || "Error in Updating Sub Tax");
      });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.map((user) => user._id) || [];
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
      searchFields: "name",
      select: "name percentage isDisable",
      ...(id ? { taxId: id } : {}),
    };
    dispatch(getListSubTax(reqData));
    setIsRefresh(!isRefresh);
  };

  const handleSearchRemove = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
    setKeyword("");
    setPageNo(1);
    setIsRefresh(!isRefresh);
  }, [dispatch, size, isRefresh]);

  const isAllRowsSelected = useMemo(
    () =>
      selectedRow.length ===
        selector?.getListSubTaxData?.data?.data?.list?.length &&
      selector?.getListSubTaxData?.data?.data?.list?.length > 0,
    [selectedRow.length, selector?.getListSubTaxData?.data?.data?.list?.length],
  );

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="max-w-7xl mx-auto">
        <div className=" overflow-hidden overflow-y-auto py-6">
          <div className="flex justify-between items-center">
            <h3>
              <Link to="/app/home" className="cursor-pointer">
                Home
              </Link>{" "}
              /{" "}
              <b>
                <Link to="/app/tax">Tax</Link>
              </b>
              / <b>SubTax</b>
            </h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => {
                setIsOpenAddModal(true);
              }}
            >
              Add
            </AddButton>
          </div>
          <div className="overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
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
                    placeholder="Search By Tax Name"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading="Sub Taxes"
              tableHeadings={["Tax Name", "Percentage", "Status", "Actions"]}
              data={tableRows}
              showSearch={true}
              placeholder="Search by..."
              showFilter={false}
              showSummary={false}
              totalData={totalUsers}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={handleSelectAllChange}
              allRowsSelected={isAllRowsSelected}
            />
          </div>
          <div className="flex justify-center my-6">
            {totalUsers > size && (
              <Pagination
                totalPages={Math.ceil(totalUsers / size)}
                currentPage={pageNo}
                onPageChange={onPageChange}
              />
            )}
          </div>
        </div>

        {/* Add Sub Tax Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddUserSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Reset"
          title="Add Sub Tax"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full px-4 pt-2">
            {!id && (
              <FilterSelect
                label="Tax"
                options={taxOptions}
                value={selectedTaxOption}
                onChange={(option) => {
                  setForm((prev) => ({ ...prev, taxId: option?.value || "" }));
                  setErrors((prev) => ({ ...prev, taxId: undefined }));
                }}
                error={errors.taxId}
                placeholder="Select tax"
                required
              />
            )}
          </div>
          <div className="w-full px-4 pt-2">
            <Input
              labelName="Tax Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              maxLength={50}
              required
            />
          </div>
          <div className="w-full px-4 pt-2">
            <Input
              labelName="Percentage"
              name="percentage"
              type="percentage"
              value={formData.percentage}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                  handleInputChange(e);
                }
              }}
              onInput={(e) => {
                let value = e.target.value;
                if (value === "") return;
                const regex = /^\d*\.?\d{0,2}$/;
                if (!regex.test(value)) {
                  value = value.slice(0, -1);
                  e.target.value = value;
                  return;
                }
                const number = parseFloat(value);

                if (!isNaN(number)) {
                  if (number < 0) {
                    e.target.value = "0";
                  } else if (number > 100) {
                    e.target.value = "100";
                  }
                } else {
                  e.target.value = "";
                }
              }}
              error={errors.percentage}
              step="0.01"
              required
            />
          </div>
          <div className="flex justify-between items-center border p-3 mt-4">
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div>
        </DefaultModal>

        {/* Edit Sub Tax Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditUserSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Sub Tax"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full">
            {!id && (
              <FilterSelect
                label="Tax"
                options={taxOptions}
                value={selectedTaxOption}
                onChange={(option) => {
                  setForm((prev) => ({ ...prev, taxId: option?.value || "" }));
                  setErrors((prev) => ({ ...prev, taxId: undefined }));
                }}
                error={errors.taxId}
                placeholder="Select tax"
                required
              />
            )}
          </div>
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
          <div className="w-full">
            <Input
              labelName="Percentage"
              name="percentage"
              type="percentage"
              value={formData.percentage}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                  handleInputChange(e);
                }
              }}
              onInput={(e) => {
                let value = e.target.value;
                if (value === "") return;
                const regex = /^\d*\.?\d{0,2}$/;
                if (!regex.test(value)) {
                  value = value.slice(0, -1);
                  e.target.value = value;
                  return;
                }
                const number = parseFloat(value);

                if (!isNaN(number)) {
                  if (number < 0) {
                    e.target.value = "0";
                  } else if (number > 100) {
                    e.target.value = "100";
                  }
                } else {
                  e.target.value = "";
                }
              }}
              error={errors.percentage}
              required
            />
          </div>
          <div className="flex justify-between items-center border p-3 mt-4">
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
          DeleteHeading={"Are you sure you want to delete the sub tax?"}
        />

        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${isRowActive(toggleStates) ? "disable" : "enable"} this sub tax?`}
        />
      </div>
    </>
  );
};

export default SubTax;
