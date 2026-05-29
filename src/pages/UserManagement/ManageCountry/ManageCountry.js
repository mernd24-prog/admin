import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import TableData from "../../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import {
  create,
  getCountryList,
  editCountry,
  enableDisableCountry,
} from "../../../Redux/CountrySlice";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Button from "../../../components/Atoms/buttons/button";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { toast } from "sonner";
import Pagination from "../../../components/Pagination/Pagination";
import Loader from "../../../components/Loader/Loader";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { Link } from "react-router-dom";
import { validateValues } from "../../../_helpers/validation";

const PAGE_SIZE = 10;

const extractListPayload = (payload = {}) => {
  const data = payload?.data || payload;
  const nestedData = data?.data || data;
  const list = nestedData?.list || nestedData?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(nestedData?.total || list.length || 0),
  };
};

export const validateCountry = (data) => {
  return validateValues(data, {
    name: {
      label: "Country name",
      required: true,
      minLength: 3,
      maxLength: 100,
      messages: {
        minLength: "Country name must be between 3-100 characters",
        maxLength: "Country name must be between 3-100 characters",
      },
    },
    code: {
      label: "Country code",
      required: true,
      minLength: 2,
      maxLength: 5,
      messages: {
        minLength: "Country code must be between 2-5 characters",
        maxLength: "Country code must be between 2-5 characters",
      },
    },
    dialCode: {
      label: "Dial code",
      required: true,
      maxLength: 10,
      messages: { maxLength: "Dial code must be 10 characters or less" },
    },
  });
};

const ManageCountry = () => {
  const dispatch = useDispatch();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);

  const initialFormState = {
    name: "",
    code: "",
    dialCode: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const fetchCountryList = useCallback(() => {
    const query = {
      page: pageNo,
      size: PAGE_SIZE,
      keyWord: filters?.search,
      searchFields: "name,code",
    };
    setIsLoading(true);
    dispatch(getCountryList(query))
      .then((res) => {
        setApiRes(extractListPayload(res?.payload));
      })
      .catch((err) => {
        console.error("Error fetching countries:", err);
        setApiRes({ list: [], total: 0 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch, pageNo, filters?.search]);

  useEffect(() => {
    fetchCountryList();
  }, [fetchCountryList]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const getAllRowIds = useCallback(() => {
    return apiRes?.list?.map((row) => row?._id) || [];
  }, [apiRes?.list]);

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? getAllRowIds() : []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggle = async (country) => {
    const currentlyActive = isRowActive(country);
    let apiPayload = {
      _id: [country?._id],
      isDisable: currentlyActive,
    };
    try {
      const res = await dispatch(enableDisableCountry(apiPayload)).unwrap();
      if (res) {
        toast.success(res?.message);
      }
      fetchCountryList();
    } catch (error) {
      toast.error(error?.message || error || "Failed...!");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateCountry(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const apiCall = isEditMode ? editCountry : create;

    setIsLoading(true);

    dispatch(apiCall(formData))
      .unwrap()
      .then((res) => {
        setIsLoading(false);
        fetchCountryList();
        closeModal();
      })
      .catch((error) => {
        toast.error(error || "Error saving country:");
        setIsLoading(false);
        if (error?.errors) {
          setErrors(error.errors);
        }
      });
  };

  const confirmDelete = async () => {};

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true,
      };
      try {
        const res = await dispatch(enableDisableCountry(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        setSelectedRow([]);
        fetchCountryList();
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        setSelectedRow([]);
        if (error.errors) {
          setErrors(error.errors);
        }
      }
    }
  };

  const tableHeadings = ["Full Name", "Code", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type="checkbox"
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className="capitalize">{ele?.name}</span>,
    ele?.code,
    <div className="flex flex-col">
      <ToggleButton
        isToggle={isRowActive(ele)}
        handleClick={() => handleToggle(ele)}
        requiredModule="countries"
      />
    </div>,
    <ActionButtons
      onEdit={() => {
        setFormData({
          name: ele.name,
          code: ele.code,
          dialCode: ele.dialCode,
          _id: ele._id,
        });
        setIsEditMode(true);
        setIsAddModal(true);
      }}
      showLinkButton={false}
      showDeleteButton={false}
      requiredModule="countries"
    />,
  ]);

  return (
    <div className="p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3">
      <Loader loading={isLoading} />
      <div className="flex justify-between items-center">
        <h3>
          Home / <Link to="/app/setting">Settings</Link> / Country
        </h3>
        <Button
          requiredModule="countries"
          requiredAction="create"
          onClick={() => {
            setFormData(initialFormState);
            setIsEditMode(false);
            setIsAddModal(true);
          }}
        >
          Add
        </Button>
      </div>

      <div className=" overflow-auto overflow-y-auto bg-white rounded-lg">
        <SearchComponent
          isSearchShow={true}
          isActionButton={true}
          filters={filters}
          setFilters={setFilters}
          isStatusAction={true}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          placeholder={`Search by name and code`}
          handleAction={handleBulkAction}
          requiredModule="countries"
        />

        <TableData
          Heading="Manage Country"
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          totalData={apiRes?.total}
          totalSize={PAGE_SIZE}
          currentPage={pageNo}
          onPageChange={onPageChange}
          isHeaderCheckbox={true}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          allRowsSelected={
            selectedRow.length === apiRes?.list?.length &&
            apiRes?.list?.length > 0
          }
        />
        {apiRes?.total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )}
      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        confirmDelete={confirmDelete}
        DeleteHeading="Are you sure you want to delete?"
      />
      <DefaultModal
        title={isEditMode ? "Edit Country" : "Add Country"}
        isOpen={isAddModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          <div className="col-span-2">
            <Input
              labelName="Name"
              type="text"
              value={formData.name}
              name="name"
              onChange={handleInputChange}
              error={errors.name}
              required
              maxLength={25}
            />
          </div>

          <Input
            labelName="Code"
            type="text"
            value={formData.code}
            name="code"
            onChange={handleInputChange}
            error={errors.code}
            required
            maxLength={25}
          />

          <Input
            labelName="Dial Code"
            type="text"
            value={formData.dialCode}
            name="dialCode"
            onChange={handleInputChange}
            error={errors.dialCode}
            required
            maxLength={25}
          />
        </div>
      </DefaultModal>
    </div>
  );
};

export default ManageCountry;
