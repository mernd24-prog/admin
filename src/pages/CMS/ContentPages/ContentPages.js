/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdArticle, MdDelete, MdEdit } from "react-icons/md";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  ConfirmModal,
  DataTable,
  PageHeader,
} from "../../../components/Shared";
import ContentPageSetup from "./components/ContentPageSetup";
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
} from "../../../Redux/adminCoreSlice";
import { contentPageValidationSchema } from "../../../_helpers/validationSchemas";

const DEFAULT_PAGE_SIZE = 10;

const emptyForm = {
  slug: "",
  title: "",
  pageType: "static_page",
  status: "draft",
  description: "",
  body: "",
  excerpt: "",
  category: "",
  tags: [],
  image: { url: "", alt: "", title: "", caption: "", type: "hero" },
  gallery: [],
  sections: [],
  cta: { label: "", url: "", target: "_self" },
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    focusKeyword: "",
    canonicalUrl: "",
    robots: "index,follow",
    ogTitle: "",
    ogDescription: "",
    ogImage: { url: "", alt: "" },
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: { url: "", alt: "" },
    schemaType: "WebPage",
    schemaJson: {},
    breadcrumbs: [],
  },
  visibility: {
    channels: ["web", "app"],
    roles: ["public"],
  },
  sortOrder: 0,
  coverImage: "",
  thumbnailUrl: "",
  heroImage: "",
  galleryImages: [],
  author: { name: "", avatar: "" },
  readTime: 0,
  language: "en",
  published: false,
  publishedAt: "",
  metadata: {},
};

const slugify = (value = "") =>
  String(value || "content-page")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "content-page";

const pageSlug = (page = {}) => page?.slug || page?.id || page?._id || "";

const ContentPages = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isRefresh, setIsRefresh] = useState(false);

  // This now controls whether the full-page setup screen is shown.
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoadingSlug, setStatusLoadingSlug] = useState("");

  const payload = selector?.contentPagesData?.data?.data || {};
  const pages = payload?.list || [];
  const total = payload?.total || 0;

  const formik = useFormik({
    initialValues: emptyForm,
    validationSchema: contentPageValidationSchema,
    onSubmit: async (values) => {
      if (submitting) return;

      const body = {
        ...values,
        published: values.status === "published" || Boolean(values.published),
        heroImage: values.heroImage || values.image?.url || "",
        coverImage: values.coverImage || values.image?.url || "",
        thumbnailUrl: values.thumbnailUrl || values.image?.url || "",
        galleryImages: Array.isArray(values.gallery)
          ? values.gallery.map((item) => item?.url).filter(Boolean)
          : values.galleryImages || [],
      };

      try {
        setSubmitting(true);

        if (values.recordSlug) {
          await dispatch(
            updateContentPage({
              ...body,
              slug: values.recordSlug,
            }),
          ).unwrap();

          toast.success("Content page updated successfully");
        } else {
          await dispatch(createContentPage(body)).unwrap();

          toast.success("Content page created successfully");
        }

        closeSetup(true);
        setIsRefresh((value) => !value);
      } catch (error) {
        toast.error(error?.message || "Failed to save content page");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const fetchPages = useCallback(() => {
    dispatch(getContentPages({ page: pageNo, limit: pageSize, q: search }));
  }, [dispatch, pageNo, pageSize, search]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages, isRefresh]);

  const onChange = (event) => {
    const { name, value } = event.target;

    formik.setFieldValue(name, value);

    if (name === "title" && !formik.values.recordSlug && !formik.values.slug) {
      formik.setFieldValue("slug", slugify(value));
    }
  };

  const closeSetup = (force = false) => {
    if (submitting && !force) return;

    setIsSetupOpen(false);
    formik.resetForm({ values: emptyForm });
  };

  const handleAddPage = () => {
    if (submitting || deleting || statusLoadingSlug) return;

    formik.resetForm({ values: emptyForm });
    setIsSetupOpen(true);
  };

  const openEdit = (page) => {
    if (submitting || deleting || statusLoadingSlug) return;

    formik.resetForm({
      values: {
        ...emptyForm,
        ...page,

        recordSlug: pageSlug(page),

        slug: page.slug || pageSlug(page),

        title: page.title || "",

        pageType: page.pageType || "content",

        status: page.status || (page.published ? "published" : "draft"),

        description: page.description || page.excerpt || "",

        excerpt: page.excerpt || page.description || "",

        category: page.category || "",

        tags: page.tags || [],

        image: page.image || {
          url: page.heroImage || page.coverImage || "",

          alt: page.title || "",

          title: "",

          caption: "",

          type: "hero",
        },

        gallery:
          page.gallery ||
          (page.galleryImages || []).map((url) => ({
            url,
            alt: page.title || "",
          })),

        sections: page.sections || [],

        cta: page.cta || emptyForm.cta,

        seo: {
          ...emptyForm.seo,
          ...(page.seo || {}),
        },

        visibility: {
          ...emptyForm.visibility,
          ...(page.visibility || {}),
        },

        sortOrder: page.sortOrder || 0,

        coverImage: page.coverImage || page.image?.url || "",

        thumbnailUrl: page.thumbnailUrl || page.image?.url || "",

        heroImage: page.heroImage || page.image?.url || "",

        galleryImages: page.galleryImages || [],

        author: page.author || emptyForm.author,

        readTime: page.readTime || 0,

        language: page.language || "en",

        body: page.body || "",

        published: Boolean(page.published),
      },
    });
    setIsSetupOpen(true);
  };

  const confirmDelete = async () => {
    const slug = pageSlug(deleteTarget);

    if (!slug || deleting) return;

    try {
      setDeleting(true);

      await dispatch(deleteContentPage({ slug })).unwrap();

      toast.success("Content page deleted successfully");

      setDeleteTarget(null);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to delete content page");
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (page) => {
    const slug = pageSlug(page);

    if (!slug || statusLoadingSlug) return;

    try {
      setStatusLoadingSlug(slug);

      await dispatch(
        updateContentPage({
          slug,
          published: !page.published,
          status: !page.published ? "published" : "draft",
        }),
      ).unwrap();

      toast.success("Status updated successfully");

      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setStatusLoadingSlug("");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (v) => <span className="font-medium text-gray-800">{v}</span>,
    },

    {
      key: "slug",
      label: "Slug",
      render: (v) => (
        <span className="font-mono text-xs text-gray-500">{v}</span>
      ),
    },

    {
      key: "pageType",
      label: "Type",
      render: (v) => <span className="capitalize text-sm">{v}</span>,
    },

    {
      key: "language",
      label: "Language",
      render: (v) => <span className="text-sm">{v || "en"}</span>,
    },

    {
      key: "published",
      label: "Published",
      render: (v, row) => (
        <ToggleButton
          isToggle={Boolean(v)}
          handleClick={() => togglePublished(row)}
          loading={statusLoadingSlug === pageSlug(row)}
          disabled={Boolean(statusLoadingSlug) || submitting || deleting}
        />
      ),
    },
  ];

  const rowActions = (row) => [
    {
      label: "Edit",
      icon: <MdEdit aria-hidden="true" size={16} />,
      onClick: () => openEdit(row),
      disabled: submitting || deleting || Boolean(statusLoadingSlug),
    },

    {
      label: "Delete",
      icon: <MdDelete aria-hidden="true" size={16} />,
      onClick: () => setDeleteTarget(row),
      danger: true,
      disabled: submitting || deleting || Boolean(statusLoadingSlug),
    },
  ];

  /*
   * =========================================================
   * FULL PAGE CREATE / EDIT SCREEN
   * =========================================================
   *
   * Same route.
   * No modal.
   * No drawer.
   * No overlay.
   *
   * When Add/Edit is clicked, ContentPageSetup replaces
   * the list in the same page area.
   */

  if (isSetupOpen) {
    return (
      <ContentPageSetup
        errors={formik.submitCount > 0 ? formik.errors : {}}
        validationAttempt={formik.submitCount}
        isValidating={formik.isValidating}
        formData={formik.values}
        isOpen={true}
        onChange={onChange}
        onClose={closeSetup}
        onSubmit={formik.handleSubmit}
        loading={submitting}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Content Pages"
        subtitle="Manage static pages, blog posts, and CMS content"
        breadcrumbs={[{ label: "Settings" }, { label: "CMS Pages" }]}
        actions={
          <button
            onClick={handleAddPage}
            disabled={submitting || deleting || Boolean(statusLoadingSlug)}
            className="flex items-center gap-1"
          >
            <MdAdd aria-hidden="true" size={16} /> Add Page
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={pages}
        loading={selector.loading}
        totalCount={total}
        page={pageNo}
        pageSize={pageSize}
        onPageChange={setPageNo}
        onPageSizeChange={(limit) => {
          setPageSize(limit);
          setPageNo(1);
        }}
        onSearch={(v) => {
          setSearch(v?.trim() || "");
          setPageNo(1);
        }}
        rowActions={rowActions}
        searchPlaceholder="Search content pages..."
        emptyText="No content pages found."
        emptyIcon={
          <MdArticle aria-hidden="true" size={40} className="text-gray-200" />
        }
        requiredModule="cms"
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        variant="danger"
        title="Delete Content Page?"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default ContentPages;
