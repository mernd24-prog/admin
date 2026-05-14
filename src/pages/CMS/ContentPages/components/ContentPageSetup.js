// import React from 'react';
// import { MdOutlineClose } from 'react-icons/md';
// import FormInput from '../../../../components/Atoms/FormInput/FormInput';
// import ButtonTransparent from '../../../../components/ButtonTransparent/button';
// import NewButton from '../../../../components/Button/NewButton';
// import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';
// import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';

// const ContentPageSetup = ({
//   errors = {},
//   formData,
//   isOpen,
//   onChange,
//   onClose,
//   onSubmit,
// }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
//       <div className="w-11/12 max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
//         <div className="flex items-center justify-between pb-3 border-b">
//           <h2 className="text-xl font-semibold">{formData?._id ? 'Edit Content Page' : 'Content Page Setup'}</h2>
//           <button onClick={onClose} className="text-gray-700 hover:text-black" type="button">
//             <MdOutlineClose size={24} />
//           </button>
//         </div>
//         <form onSubmit={onSubmit} className="space-y-4 pt-4">
//           <FormInput
//             label="Title"
//             name="title"
//             value={formData.title}
//             onChange={onChange}
//             error={errors.title}
//             placeholder="Enter content page title"
//             required
//           />
//           <FormInput
//             label="Slug"
//             name="slug"
//             value={formData.slug}
//             onChange={onChange}
//             error={errors.slug}
//             placeholder="privacy-policy"
//             required
//           />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <FormInput
//               label="Page Type"
//               name="pageType"
//               value={formData.pageType}
//               onChange={onChange}
//               error={errors.pageType}
//               placeholder="policy"
//               required
//             />
//             <FormInput
//               label="Language"
//               name="language"
//               value={formData.language}
//               onChange={onChange}
//               error={errors.language}
//               placeholder="en"
//               required
//             />
//           </div>
//           <TextEditor
//             label="Body"
//             value={formData.body}
//             onChange={(val) => onChange({ target: { name: 'body', value: val } })}
//             placeholder="Write page content..."
//             height="250px"
//             error={errors.body}
//           />
//           <div className="flex justify-between items-center border p-3 rounded-md">
//             <p className="font-medium text-sm">Published</p>
//             <ToggleButton isToggle={formData.published} handleClick={() => onChange({ target: { name: 'published', value: !formData.published } })} />
//           </div>
//           <div className="flex justify-end gap-4 mt-6">
//             <ButtonTransparent type="button" onClick={onClose}>
//               Cancel
//             </ButtonTransparent>
//             <NewButton type="submit">{formData?._id ? 'Update' : 'Submit'}</NewButton>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ContentPageSetup;
import React from "react";
import { MdOutlineClose } from "react-icons/md";
import FormInput from "../../../../components/Atoms/FormInput/FormInput";
import ButtonTransparent from "../../../../components/ButtonTransparent/button";
import NewButton from "../../../../components/Button/NewButton";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";
import { TextEditor } from "../../../../components/Atoms/FormInput/TextEditor";

const ContentPageSetup = ({
  errors = {},
  formData,
  isOpen,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const handleArrayChange = (name, value) => {
    onChange({
      target: {
        name,
        value: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    });
  };

  const handleNestedChange = (parent, key, value) => {
    onChange({
      target: {
        name: parent,
        value: {
          ...(formData[parent] || {}),
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-11/12 max-w-6xl max-h-[95vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {formData?._id
                ? "Edit Content Page"
                : "Create Content Page"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage content pages, policies, blogs, FAQs, SEO and metadata.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 transition hover:bg-gray-100"
          >
            <MdOutlineClose size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6 pt-6">
          {/* Basic Information */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Title"
                name="title"
                value={formData.title || ""}
                onChange={onChange}
                error={errors.title}
                placeholder="Privacy Policy"
                required
              />

              <FormInput
                label="Slug"
                name="slug"
                value={formData.slug || ""}
                onChange={onChange}
                error={errors.slug}
                placeholder="privacy-policy"
                required
              />

              <FormInput
                label="Page Type"
                name="pageType"
                value={formData.pageType || ""}
                onChange={onChange}
                error={errors.pageType}
                placeholder="policy / blog / faq"
                required
              />

              <FormInput
                label="Category"
                name="category"
                value={formData.category || ""}
                onChange={onChange}
                error={errors.category}
                placeholder="legal / support / marketing"
              />

              <FormInput
                label="Language"
                name="language"
                value={formData.language || "en"}
                onChange={onChange}
                error={errors.language}
                placeholder="en"
              />

              <FormInput
                label="Read Time (Minutes)"
                name="readTime"
                type="number"
                value={formData.readTime || 0}
                onChange={onChange}
                error={errors.readTime}
                placeholder="5"
              />
            </div>

            <div className="mt-4">
              <FormInput
                label="Excerpt"
                name="excerpt"
                value={formData.excerpt || ""}
                onChange={onChange}
                error={errors.excerpt}
                placeholder="Short summary of this content page"
              />
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Content Body
            </h3>

            <TextEditor
              label="Body"
              value={formData.body || ""}
              onChange={(val) =>
                onChange({
                  target: {
                    name: "body",
                    value: val,
                  },
                })
              }
              placeholder="Write page content..."
              height="350px"
              error={errors.body}
            />
          </div>

          {/* Media */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Media & Images
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Cover Image"
                name="coverImage"
                value={formData.coverImage || ""}
                onChange={onChange}
                error={errors.coverImage}
                placeholder="https://example.com/cover.jpg"
              />

              <FormInput
                label="Thumbnail URL"
                name="thumbnailUrl"
                value={formData.thumbnailUrl || ""}
                onChange={onChange}
                error={errors.thumbnailUrl}
                placeholder="https://example.com/thumb.jpg"
              />

              <FormInput
                label="Hero Image"
                name="heroImage"
                value={formData.heroImage || ""}
                onChange={onChange}
                error={errors.heroImage}
                placeholder="https://example.com/hero.jpg"
              />

              <FormInput
                label="Gallery Images"
                name="galleryImages"
                value={(formData.galleryImages || []).join(", ")}
                onChange={(e) =>
                  handleArrayChange(
                    "galleryImages",
                    e.target.value
                  )
                }
                error={errors.galleryImages}
                placeholder="url1, url2, url3"
              />
            </div>
          </div>

          {/* Author */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Author Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Author Name"
                value={formData.author?.name || ""}
                onChange={(e) =>
                  handleNestedChange(
                    "author",
                    "name",
                    e.target.value
                  )
                }
                error={errors?.author?.name}
                placeholder="John Doe"
              />

              <FormInput
                label="Author Avatar"
                value={formData.author?.avatar || ""}
                onChange={(e) =>
                  handleNestedChange(
                    "author",
                    "avatar",
                    e.target.value
                  )
                }
                error={errors?.author?.avatar}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {/* Tags & SEO */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Tags & SEO
            </h3>

            <div className="space-y-4">
              <FormInput
                label="Tags"
                name="tags"
                value={(formData.tags || []).join(", ")}
                onChange={(e) =>
                  handleArrayChange("tags", e.target.value)
                }
                error={errors.tags}
                placeholder="policy, ecommerce, terms"
              />

              <FormInput
                label="Published At"
                name="publishedAt"
                type="datetime-local"
                value={
                  formData.publishedAt
                    ? new Date(formData.publishedAt)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={onChange}
                error={errors.publishedAt}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">
              Metadata (JSON)
            </h3>

            <textarea
              rows={6}
              className="w-full rounded-md border p-3 text-sm outline-none focus:border-black"
              placeholder='{"seoTitle":"Privacy Policy"}'
              value={JSON.stringify(
                formData.metadata || {},
                null,
                2
              )}
              onChange={(e) => {
                try {
                  onChange({
                    target: {
                      name: "metadata",
                      value: JSON.parse(e.target.value || "{}"),
                    },
                  });
                } catch (err) {}
              }}
            />
          </div>

          {/* Publish Toggle */}
          <div className="rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Publish Content
                </h3>
                <p className="text-sm text-gray-500">
                  Enable this to make the page publicly visible.
                </p>
              </div>

              <ToggleButton
                isToggle={!!formData.published}
                handleClick={() =>
                  onChange({
                    target: {
                      name: "published",
                      value: !formData.published,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-4 border-t pt-5">
            <ButtonTransparent
              type="button"
              onClick={onClose}
            >
              Cancel
            </ButtonTransparent>

            <NewButton type="submit">
              {formData?._id ? "Update Page" : "Create Page"}
            </NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentPageSetup;