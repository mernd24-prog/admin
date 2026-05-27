/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import TableData from "../../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import Loader from "../../../components/Loader/Loader";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Pagination from "../../../components/Pagination/Pagination";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import CustomCheckbox from "../../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import AddButton from "../../../components/Button/AddButton";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import { validateValues } from "../../../_helpers/validation";

import {
  createHsn,
  getHsnList,
  updateHsn,
  enableDisableHsn,
  softDeleteHsn,
} from "../../../Redux/productSlice";

const PAGE_SIZE = 10;

const INITIAL_FORM_STATE = {
  code: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
  description: "",
  isDisable: false,
};

const HSN_VALIDATION_SCHEMA = {
  code: {
    label: "HSN Code",
    required: true,
    hsn: true,
    messages: { hsn: "HSN Code must be 4 to 8 digits" },
  },
  IGST: { label: "IGST", required: true, number: true, min: 0, max: 100 },
  CGST: { label: "CGST", required: true, number: true, min: 0, max: 100 },
  SGST: { label: "SGST", required: true, number: true, min: 0, max: 100 },
  additionalTax: {
    label: "Additional Tax",
    required: true,
    number: true,
    min: 0,
    max: 100,
  },
};

const HsnCode = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product); // Changed to product selector

  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isRefresh, setIsRefresh] = useState(false);

  const getAllRowIds = useMemo(
    () => apiRes?.list?.map((row) => row?._id) || [],
    [apiRes?.list],
  );

  const isAllRowsSelected = useMemo(
    () =>
      selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0,
    [selectedRow.length, apiRes?.list?.length],
  );

  const fetchHsnList = useCallback(
    async (searchKeyword = filters?.search) => {
      const query = {
        page: pageNo,
        size: PAGE_SIZE,
        select:
          "code IGST CGST SGST additionalTax description isDisable createdAt",
        keyWord: searchKeyword || "",
        searchFields: "code,description",
        sortOrder: "asc",
        sortBy: "code",
      };

      setIsLoading(true);
      try {
        const res = await dispatch(getHsnList(query)).unwrap();
        setApiRes(res?.data || { list: [], total: 0 });
      } catch (err) {
        setApiRes({ list: [], total: 0 });
        toast.error(err?.message || "Failed to fetch HSN codes");
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, pageNo, filters?.search],
  );

  useEffect(() => {
    fetchHsnList();
  }, [fetchHsnList, isRefresh]);

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo);
  }, []);

  const handleHeaderCheckboxChange = useCallback(
    (e) => {
      setSelectedRow(e.target.checked ? getAllRowIds : []);
    },
    [getAllRowIds],
  );

  const handleRowCheckboxChange = useCallback((e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type } = e.target;

      // Handle number inputs
      const processedValue =
        type === "number" ? (value === "" ? 0 : Number(value)) : value;

      setFormData((prev) => ({ ...prev, [name]: processedValue }));

      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors],
  );

  const validateForm = useCallback(() => {
    return validateValues(formData, HSN_VALIDATION_SCHEMA);
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setIsEditMode(false);
    setIsAddModal(false);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const basePayload = {
        code: formData?.code,
        IGST: Number(formData.IGST),
        CGST: Number(formData.CGST),
        SGST: Number(formData.SGST),
        additionalTax: Number(formData.additionalTax),
        description: formData.description?.trim() || "",
        isDisable: formData?.isDisable,
      };

      try {
        if (isEditMode) {
          await dispatch(
            updateHsn({ ...basePayload, _id: formData._id }),
          ).unwrap();
          toast.success("HSN Code updated successfully");
        } else {
          const createPayload = {
            ...basePayload,
            isDisable: formData.isDisable,
          };
          await dispatch(createHsn(createPayload)).unwrap();
          toast.success("HSN Code created successfully");
        }

        resetForm();
        setIsRefresh(!isRefresh);
      } catch (error) {
        toast.error(error || error?.message || "Failed to save HSN Code");
      }
    },
    [formData, isEditMode, validateForm, dispatch, resetForm, isRefresh],
  );

  const handleToggle = useCallback(
    async (data) => {
      const apiPayload = {
        _id: [data?._id],
        isDisable: !data?.isDisable,
      };

      try {
        setIsLoading(true);
        const res = await dispatch(enableDisableHsn(apiPayload)).unwrap();
        toast.success(res?.message || "Status updated successfully");
        fetchHsnList();
        setIsLoading(false);
      } catch (error) {
        toast.error(error?.message || "Failed to update status");
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, fetchHsnList],
  );

  const handleDelete = useCallback(
    async (data) => {
      const apiPayload = { _id: [data?._id] };
      try {
        const res = await dispatch(softDeleteHsn(apiPayload)).unwrap();
        toast.success(res?.message || "HSN Code deleted successfully");
        fetchHsnList();
      } catch (error) {
        console.log(error);
        toast.error(error?.message || "Failed to delete HSN Code");
      }
    },
    [dispatch, fetchHsnList],
  );

  const handleBulkAction = useCallback(
    async (action) => {
      if (!selectedRow.length) {
        toast.error("Please select items first");
        return;
      }

      setIsLoading(true);
      try {
        let res;
        if (action === "Active" || action === "Inactive") {
          const apiPayload = {
            _id: selectedRow,
            isDisable: action === "Inactive",
          };
          res = await dispatch(enableDisableHsn(apiPayload)).unwrap();
        } else if (action === "Delete") {
          const apiPayload = { _id: selectedRow };
          res = await dispatch(softDeleteHsn(apiPayload)).unwrap();
        }

        toast.success(
          res?.message || `${action} operation completed successfully`,
        );
        setSelectedRow([]);
        fetchHsnList();
      } catch (error) {
        toast.error(
          error?.message || `Failed to ${action.toLowerCase()} items`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRow, dispatch, fetchHsnList],
  );

  const handleEdit = useCallback((item) => {
    setFormData({
      _id: item._id,
      code: item.code,
      IGST: item.IGST || 0,
      CGST: item.CGST || 0,
      SGST: item.SGST || 0,
      additionalTax: item.additionalTax || 0,
      description: item.description || "",
      isDisable: item?.isDisable,
    });
    setIsEditMode(true);
    setIsAddModal(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditMode(false);
    setIsAddModal(true);
  }, []);

  const applyFilters = useCallback(() => {
    setPageNo(1); // Reset to first page when applying filters
    fetchHsnList(filters?.search);
  }, [fetchHsnList, filters?.search]);

  const handleSearchRemove = useCallback(() => {
    setFilters({ search: "" });
    setPageNo(1);
    fetchHsnList("");
  }, [fetchHsnList]);

  const tableHeadings = [
    "HSN Code",
    "IGST (%)",
    "CGST (%)",
    "SGST (%)",
    "Additional Tax",
    "Description",
    "Status",
    "Action",
  ];

  const tableRows = useMemo(
    () =>
      apiRes?.list?.map((item) => [
        <div key={`checkbox-${item._id}`}>
          <CustomCheckbox
            checked={selectedRow.includes(item._id)}
            onChange={(e) => handleRowCheckboxChange(e, item._id)}
          />
        </div>,
        <span
          key={`code-${item._id}`}
          className="text-sm font-medium text-gray-800 font-mono"
        >
          {item?.code}
        </span>,
        <span key={`igst-${item._id}`} className="text-sm text-gray-700">
          {item?.IGST || 0}%
        </span>,
        <span key={`cgst-${item._id}`} className="text-sm text-gray-700">
          {item?.CGST || 0}%
        </span>,
        <span key={`sgst-${item._id}`} className="text-sm text-gray-700">
          {item?.SGST || 0}%
        </span>,
        <span key={`additional-${item._id}`} className="text-sm text-gray-700">
          {item?.additionalTax || 0}
        </span>,
        <span
          key={`description-${item._id}`}
          className="text-sm text-gray-700 max-w-xs truncate"
          title={item?.description}
        >
          {item?.description || "-"}
        </span>,
        <div
          key={`toggle-${item._id}`}
          className={isLoading ? " cursor-progress" : "cursor-default"}
        >
          <ToggleButton
            isToggle={!item?.isDisable}
            handleClick={() => handleToggle(item)}
            requiredModule="products"
          />
        </div>,
        <div key={`actions-${item._id}`} className="flex justify-center gap-2">
          <ActionButtons
            onEdit={() => handleEdit(item)}
            showLinkButton={false}
            showDeleteButton={true}
            onDelete={() => handleDelete(item)}
            requiredModule="products"
          />
        </div>,
      ]) || [],
    [
      apiRes?.list,
      selectedRow,
      handleRowCheckboxChange,
      handleToggle,
      handleEdit,
      handleDelete,
    ],
  );

  const handleToggleAction = () => {
    setFormData((prev) => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  return (
    <div className="p-6 overflow-hidden max-w-8xl mx-auto overflow-x-auto overflow-y-auto space-y-3">
      <Loader loading={isLoading || selector?.loading} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Home / HSN Code</h3>
        <AddButton onClick={handleAddNew} requiredModule="products">
          Add HSN Code
        </AddButton>
      </div>

      <div className="p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
        <SearchComponent
          isSearchShow={true}
          isActionButton={true}
          filters={filters}
          setFilters={setFilters}
          isStatusAction={true}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          placeholder="Search by HSN code or description"
          handleAction={handleBulkAction}
          applyFilters={applyFilters}
          handleSearchRemove={handleSearchRemove}
          isDelete={true}
          requiredModule="products"
        />

        <TableData
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={false}
          showFilter={false}
          showSummary={false}
          totalData={apiRes?.total}
          totalSize={PAGE_SIZE}
          currentPage={pageNo}
          isHeaderCheckbox={true}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          allRowsSelected={isAllRowsSelected}
        />

        {apiRes?.total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <DefaultModal
        title={isEditMode ? "Edit HSN Code" : "Add HSN Code"}
        isOpen={isAddModal}
        onClose={resetForm}
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          <Input
            labelName="HSN Code"
            type="text"
            value={formData.code}
            name="code"
            onChange={handleInputChange}
            error={errors.code}
            required
            placeholder="e.g., 49012"
          />

          <Input
            labelName="IGST (%)"
            type="number"
            value={formData.IGST}
            name="IGST"
            onChange={handleInputChange}
            error={errors.IGST}
          />

          <Input
            labelName="CGST (%)"
            type="number"
            value={formData.CGST}
            name="CGST"
            onChange={handleInputChange}
            error={errors.CGST}
          />

          <Input
            labelName="SGST (%)"
            type="number"
            value={formData.SGST}
            name="SGST"
            onChange={handleInputChange}
            error={errors.SGST}
          />
          <div className="col-span-2">
            <Input
              labelName="Additional Tax"
              type="number"
              value={formData.additionalTax}
              name="additionalTax"
              onChange={handleInputChange}
              error={errors.additionalTax}
            />
          </div>

          <div className="md:col-span-2">
            <FormInput
              type="textarea"
              value={formData?.description}
              onChange={handleInputChange}
              name="description"
              labelName="Description"
              placeholder="Enter HSN code description..."
            />
          </div>
          <div className="flex items-center justify-between col-span-2 border p-2 rounded">
            <p className="font-medium">Active Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAction}
            />
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default HsnCode;
