import React from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';

const ContentPageSetup = ({
  errors = {},
  formData,
  isOpen,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-11/12 max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">{formData?._id ? 'Edit Content Page' : 'Content Page Setup'}</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black" type="button">
            <MdOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <FormInput
            label="Title"
            name="title"
            value={formData.title}
            onChange={onChange}
            error={errors.title}
            placeholder="Enter content page title"
            required
          />
          <FormInput
            label="Slug"
            name="slug"
            value={formData.slug}
            onChange={onChange}
            error={errors.slug}
            placeholder="privacy-policy"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Page Type"
              name="pageType"
              value={formData.pageType}
              onChange={onChange}
              error={errors.pageType}
              placeholder="policy"
              required
            />
            <FormInput
              label="Language"
              name="language"
              value={formData.language}
              onChange={onChange}
              error={errors.language}
              placeholder="en"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              name="body"
              value={formData.body}
              onChange={onChange}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Write page content..."
            />
            {errors.body && <p className="text-red-500 text-sm mt-1">{errors.body}</p>}
          </div>
          <div className="flex justify-between items-center border p-3 rounded-md">
            <p className="font-medium text-sm">Published</p>
            <ToggleButton isToggle={formData.published} handleClick={() => onChange({ target: { name: 'published', value: !formData.published } })} />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <ButtonTransparent type="button" onClick={onClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">{formData?._id ? 'Update' : 'Submit'}</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentPageSetup;
