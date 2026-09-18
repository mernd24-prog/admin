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
import { useListPage } from "../../../hooks/useListPage";
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

  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const payload = listData?.data?.data ?? listData?.data ?? [];

  const rows = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.list || [];

  const totalCount = Array.isArray(payload)
    ? rows.length
    : payload?.total || payload?.totalCount || payload?.count || 0;

  const load = useCallback(
    () =>
      dispatch(
        listCollections({
          page: list.page,
          limit: list.pageSize,
        }),
      ),
    [dispatch, list.page, list.pageSize],
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
            <CollectionCardThumbnail
              image={row.thumbnailImage}
              name={row.name}
            />

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
        totalCount={totalCount}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowKey={(row) => row?._id || row?.id || row?.slug}
        emptyText="No collections found"
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Collection" : "New Collection"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                name="name"
                value={form.name}
                onChange={set("name")}
                required
              />

              <Input
                label="Slug"
                name="slug"
                value={form.slug}
                onChange={set("slug")}
                placeholder="generated-from-name"
              />

              <Input
                label="Type"
                name="type"
                value={form.type}
                onChange={set("type")}
                placeholder="seasonal, sale, custom"
              />

              <Input
                label="Sort order"
                name="sortOrder"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={set("sortOrder")}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Description"
                  name="description"
                  type="textarea"
                  rows={4}
                  value={form.description}
                  onChange={set("description")}
                />
              </div>

              <div className="sm:col-span-2">
                <ImageUpload
                  id="collection-thumbnail-upload"
                  label="Thumbnail Image"
                  subtext="JPG, PNG, WEBP, or SVG up to 5MB"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  file={form.thumbnailImage}
                  onChange={(file) => handleImageUpload(file, "thumbnailImage")}
                  onRemove={() =>
                    setForm((prev) => ({ ...prev, thumbnailImage: "" }))
                  }
                  isLoading={uploadingField === "thumbnailImage"}
                  loadingText="Uploading thumbnail..."
                  isDisabled={Boolean(uploadingField)}
                />
              </div>

              <Input
                label="Category keys"
                name="categoriesText"
                value={form.categoriesText}
                onChange={set("categoriesText")}
                placeholder="electronics, fashion"
              />

              <Input
                label="Tags"
                name="tagsText"
                value={form.tagsText}
                onChange={set("tagsText")}
                placeholder="Summer, Trending"
              />

              <Input
                label="Starts at"
                name="startsAt"
                type="date"
                value={form.startsAt}
                onChange={set("startsAt")}
              />

              <Input
                label="Ends at"
                name="endsAt"
                type="date"
                value={form.endsAt}
                onChange={set("endsAt")}
              />

              <Input
                type="toggle"
                name="featured"
                value={form.featured}
                onChange={set("featured")}
              >
                Featured on customer home
              </Input>

              <Input
                type="toggle"
                name="active"
                value={form.active}
                onChange={set("active")}
              >
                Active
              </Input>
            </div>
            <div className="flex justify-end gap-3">
              <TransparentButton
                type="button"
                onClick={() => {
                  setOpen(false);
                  setUploadingField(null);
                }}
                label="Cancel"
              />

              <OrangeButton
                type="submit"
                disabled={saving || Boolean(uploadingField)}
              >
                {saving
                  ? "Saving…"
                  : uploadingField
                    ? "Uploading…"
                    : "Save Collection"}
              </OrangeButton>
            </div>
          </form>
        </div>
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
