/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdSettings } from "react-icons/md";
import Input from "../../../components/Atoms/Input/Input";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ConfirmModal, DataTable, PageHeader } from "../../../components/Shared";
import {
  createInterest,
  deleteInterest,
  enableDisableInterest,
  getInterestListData,
  updateInterest,
} from "../../../Redux/adminSlice";

const emptyForm = { _id: null, name: "", isDisable: false };

const PreferenceFormModal = ({ open, onClose, onSubmit, formData, onChange, onToggle, errors }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">{formData._id ? "Edit Preference" : "Add New Preference"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <Input
            labelName="Preference Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={onChange}
            placeholder="Enter preference name"
            error={errors.name}
            maxLength={50}
            required
            onInput={(e) => {
              let val = e.target.value.replace(/^\s+/, "").replace(/[^a-zA-Z0-9\s-]/g, "");
              if (val.length > 50) val = val.slice(0, 50);
              e.target.value = val;
            }}
          />
          <div className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm font-medium text-gray-700">Status (Active)</span>
            <ToggleButton isToggle={!formData.isDisable} handleClick={onToggle} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="admin-btn-secondary">Cancel</button>
            <button type="submit" className="admin-btn-primary">{formData._id ? "Update" : "Add Preference"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Preferences = () => {
  const dispatch = useDispatch();

  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [isRefresh, setIsRefresh] = useState(false);

  const loadList = async () => {
    setIsLoading(true);
    try {
      const res = await dispatch(getInterestListData({ page: 1, size: 20, keyWord: "", sortBy: "createdAt", sortOrder: "desc" }));
      setApiRes({ list: res?.payload?.data?.list || [], total: res?.payload?.data?.total || 0 });
    } catch (err) {
      toast.error("Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadList(); }, [isRefresh]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) {
      newErrors.name = "Preference name is required";
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(formData.name)) {
      newErrors.name = "Name must not contain special characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const closeModal = () => { setIsModalOpen(false); setFormData(emptyForm); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (formData._id) {
        const res = await dispatch(updateInterest({ _id: formData._id, name: formData.name, isDisable: formData.isDisable })).unwrap();
        toast.success(res.message || "Preference updated successfully");
      } else {
        const res = await dispatch(createInterest({ name: formData.name, isDisable: formData.isDisable })).unwrap();
        toast.success(res.message || "Preference created successfully");
      }
      closeModal();
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to save preference");
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(enableDisableInterest({ _id: [toggleTarget._id], isDisable: !toggleTarget.isDisable })).unwrap();
      toast.success(res.message || "Status updated successfully");
      setToggleTarget(null);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(deleteInterest({ _id: [deleteTarget._id] }));
      toast.success(res?.payload?.message || "Preference deleted successfully");
      setDeleteTarget(null);
      loadList();
    } catch (error) {
      toast.error("Failed to delete preference");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (v) => <span className="capitalize font-medium text-gray-800">{v}</span>,
    },
    {
      key: "isDisable",
      label: "Status",
      render: (v, row) => (
        <ToggleButton isToggle={!v} handleClick={() => setToggleTarget(row)} />
      ),
    },
  ];

  const rowActions = (row) => [
    {
      label: "Edit",
      onClick: () => {
        setFormData({ _id: row._id, name: row.name, isDisable: row.isDisable });
        setIsModalOpen(true);
      },
    },
    { label: "Delete", onClick: () => setDeleteTarget(row), danger: true },
  ];

  return (
    <div>
      <PageHeader
        title="Preferences"
        subtitle="Manage user interest categories and preferences"
        breadcrumbs={[{ label: "User Management" }, { label: "Preferences" }]}
        actions={
          <button onClick={() => { setFormData(emptyForm); setIsModalOpen(true); }}>
            + Add Preference
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={apiRes.list}
        loading={isLoading}
        totalCount={apiRes.total}
        rowActions={rowActions}
        searchPlaceholder="Search preferences..."
        emptyText="No preferences found."
        emptyIcon={<MdSettings size={40} className="text-gray-200" />}
        requiredModule="preferences"
      />

      <PreferenceFormModal
        open={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        onChange={handleInputChange}
        onToggle={() => setFormData((prev) => ({ ...prev, isDisable: !prev.isDisable }))}
        errors={errors}
      />

      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Preference?`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} preference "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete Preference?"
        message={`Delete preference "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default Preferences;
