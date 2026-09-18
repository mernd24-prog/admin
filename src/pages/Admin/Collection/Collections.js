import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdRefresh } from "react-icons/md";
import {
  ConfirmModal,
  DataTable,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "../../../Redux/collectionSlice";
import { CollectionCardThumbnail } from "../../ProductManagement/ProductCatalog/components/AddEditProduct";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";
import Input from "../../../components/Atoms/Input/Input";
import ImageUpload from "../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadFile } from "../../../_helpers/globalFunctions";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";

const emptyForm = {
  name: "",
  slug: "",
  type: "custom",
  description: "",
  bannerImage: "",
  thumbnailImage: "",
  categoriesText: "",
  tagsText: "",
  sortOrder: 0,
  featured: false,
  active: true,
  startsAt: "",
  endsAt: "",
};
const dateValue = (value) => (value ? String(value).slice(0, 10) : "");

export default function Collections() {
  const dispatch = useDispatch();
  const { loading, listData } = useSelector((state) => state.collection);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const payload = listData?.data?.data ?? listData?.data ?? [];
  const rows = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.list || [];

  const load = useCallback(
    () => dispatch(listCollections({ page: 1, limit: 200 })),
    [dispatch],
  );
  useEffect(() => {
    load();
  }, [load]);

  const beginCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setUploadingField(null);
    setOpen(true);
  };
  const beginEdit = (row) => {
    setEditing(row);
    setUploadingField(null);
    setForm({
      ...emptyForm,
      ...row,
      categoriesText: (row.categories || []).join(", "),
      tagsText: (row.tags || []).join(", "),
      startsAt: dateValue(row.startsAt),
      endsAt: dateValue(row.endsAt),
      active: row.active ?? row.isActive ?? true,
    });
    setOpen(true);
  };
  const set = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));

  const handleImageUpload = async (file, field) => {
    if (!file) return;

    const allowed = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];
    const ext = file.name?.split(".").pop()?.toLowerCase();
    if (
      !allowed.includes(file.type) &&
      !["png", "jpg", "jpeg", "webp", "svg"].includes(ext)
    ) {
      toast.error("Only JPG, PNG, WEBP, or SVG images allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB");
      return;
    }

    setUploadingField(field);
    try {
      const url = await uploadFile(file, "COLLECTIONS");
      setForm((prev) => ({
        ...prev,
        [field]: url,
      }));
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error(error?.message || error || "Image upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (uploadingField) {
      return toast.error("Please wait for the image to finish uploading");
    }
    if (!form.name.trim()) return toast.error("Collection name is required");
    setSaving(true);
    try {
      const { categoriesText, tagsText, ...values } = form;
      const split = (text) =>
        String(text || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      const body = {
        ...values,
        categories: split(categoriesText),
        tags: split(tagsText),
        sortOrder: Number(form.sortOrder || 0),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      if (editing)
        await dispatch(
          updateCollection({
            collectionId: editing._id || editing.slug,
            ...body,
          }),
        ).unwrap();
      else await dispatch(createCollection(body)).unwrap();
      toast.success(editing ? "Collection updated" : "Collection created");
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error?.message || "Unable to save collection");
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await dispatch(
        deleteCollection({
          collectionId: deleteTarget._id || deleteTarget.slug,
        }),
      ).unwrap();
      toast.success("Collection deleted");
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(error?.message || "Collection is still assigned to products");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Collection",
        render: (_, row) => (
          <div className="flex items-center gap-3">
            {row.thumbnailImage ? (
              <CollectionCardThumbnail
                image={row.thumbnailImage}
                name={row.name}
              />
            ) : null}
            <div>
              <strong>{row.name}</strong>
              <div className="text-xs text-gray-500">{row.slug}</div>
            </div>
          </div>
        ),
      },
      { key: "type", label: "Type" },
      {
        key: "featured",
        label: "Featured",
        render: (value) => (
          <StatusBadge
            status={value ? "active" : "inactive"}
            label={value ? "Featured" : "Standard"}
          />
        ),
      },
      {
        key: "active",
        label: "Status",
        render: (_, row) => (
          <StatusBadge
            status={
              (row.active ?? row.isActive) !== false ? "active" : "inactive"
            }
            dot
          />
        ),
      },
      { key: "sortOrder", label: "Order" },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => beginEdit(row)}
              className="rounded border p-2"
              title="Edit"
            >
              <MdEdit />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="rounded border border-red-200 p-2 text-red-600"
              title="Delete"
            >
              <MdDelete />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collections"
        subtitle="Create curated product groups for customer discovery and homepage merchandising"
        breadcrumbs={[
          { label: "Catalog Management" },
          { label: "Collections" },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="admin-button-secondary"
            >
              <MdRefresh /> Refresh
            </button>
            <button
              type="button"
              onClick={beginCreate}
              className="admin-button-primary"
            >
              <MdAdd /> New Collection
            </button>
          </div>
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No collections found"
      />
     {open && (
  <DefaultModal
    isOpen={open}
    onClose={() => {
      setOpen(false);
      setUploadingField(null);
    }}
    onSubmit={save}
    title={editing ? "Edit Collection" : "New Collection"}
    submitButtonText={saving ? "Saving..." : "Save Collection"}
    closeButtonText="Cancel"
    isButtonView={true}
    width="650px"
    loading={saving || Boolean(uploadingField)}
  >
    <div className="space-y-5">
      {/* ==================== Basic Information ==================== */}
      <FormSection
        title="Basic Information"
        description="Enter the basic details for this collection."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <FormInput
            label="Name"
            name="name"
            value={form.name}
            onChange={set("name")}
            placeholder="Enter collection name"
            required
          />

          {/* Slug */}
          <FormInput
            label="Slug"
            name="slug"
            value={form.slug}
            onChange={set("slug")}
            placeholder="generated-from-name"
          />

          {/* Type */}
          <FormInput
            label="Type"
            name="type"
            value={form.type}
            onChange={set("type")}
            placeholder="seasonal, sale, custom"
          />

          {/* Sort Order */}
          <FormInput
            label="Sort Order"
            name="sortOrder"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={set("sortOrder")}
            placeholder="0"
          />

          {/* Description */}
          <div className="sm:col-span-2">
            <FormInput
              label="Description"
              name="description"
              type="textarea"
              rows={4}
              value={form.description}
              onChange={set("description")}
              placeholder="Enter collection description"
            />
          </div>
        </div>
      </FormSection>

      {/* ==================== Collection Image ==================== */}
      <FormSection
        title="Collection Image"
        description="Upload an image to represent this collection."
      >
        <ImageUpload
          id="collection-thumbnail-upload"
          label="Thumbnail Image"
          subtext="JPG, PNG, WEBP, or SVG up to 5MB"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          file={form.thumbnailImage}
          onChange={(file) =>
            handleImageUpload(file, "thumbnailImage")
          }
          onRemove={() =>
            setForm((prev) => ({
              ...prev,
              thumbnailImage: "",
            }))
          }
          isLoading={uploadingField === "thumbnailImage"}
          loadingText="Uploading thumbnail..."
          isDisabled={Boolean(uploadingField)}
        />
      </FormSection>

      {/* ==================== Collection Configuration ==================== */}
      <FormSection
        title="Collection Configuration"
        description="Configure categories, tags, and collection timing."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Categories */}
          <FormInput
            label="Category Keys"
            name="categoriesText"
            value={form.categoriesText}
            onChange={set("categoriesText")}
            placeholder="electronics, fashion"
          />

          {/* Tags */}
          <FormInput
            label="Tags"
            name="tagsText"
            value={form.tagsText}
            onChange={set("tagsText")}
            placeholder="Summer, Trending"
          />

          {/* Start Date */}
          <FormInput
            label="Starts At"
            name="startsAt"
            type="date"
            value={form.startsAt}
            onChange={set("startsAt")}
          />

          {/* End Date */}
          <FormInput
            label="Ends At"
            name="endsAt"
            type="date"
            value={form.endsAt}
            onChange={set("endsAt")}
          />
        </div>
      </FormSection>

      {/* ==================== Visibility Settings ==================== */}
      <FormSection
        title="Visibility Settings"
        description="Control how this collection appears to customers."
      >
        <div className="space-y-3">
          <FormToggleRow
            title="Featured on Customer Home"
            description="Show this collection on the customer home page."
            isToggle={form.featured}
            handleClick={() =>
              setForm((prev) => ({
                ...prev,
                featured: !prev.featured,
              }))
            }
          />

          <FormToggleRow
            title="Active"
            description="Make this collection available to customers."
            isToggle={form.active}
            handleClick={() =>
              setForm((prev) => ({
                ...prev,
                active: !prev.active,
              }))
            }
          />
        </div>
      </FormSection>
    </div>
  </DefaultModal>
)}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Delete Collection"
        message={`Delete “${deleteTarget?.name || "this collection"}”? Assigned collections cannot be deleted.`}
      />
    </div>
  );
}
