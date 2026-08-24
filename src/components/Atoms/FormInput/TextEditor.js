import React, { useMemo, useCallback, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import { uploadFile } from "../../../_helpers/globalFunctions";

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["link", "image"],
  ["clean"],
];

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
  "indent",
  "align",
  "link",
  "image",
];

export const TextEditor = React.memo(
  ({
    value = "",
    onChange,
    placeholder = "Enter content...",
    theme = "snow",
    readOnly = false,
    className = "",
    error = "",
    required = false,
    label = "",
    height = "200px",
    maxLength = null,
  }) => {
    const quillRef = useRef(null);

    const modules = useMemo(
      () => ({
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: {
            image: function () {
              const input = document.createElement("input");
              input.setAttribute("type", "file");
              input.setAttribute("accept", "image/jpeg,image/png,image/webp");
              input.click();
              input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                  const url = await uploadFile(file, "CMS");
                  const quill = quillRef.current?.getEditor();
                  if (quill) {
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, "image", url);
                    quill.setSelection(range.index + 1);
                  }
                } catch {
                  toast.error("Image upload failed");
                }
              };
            },
          },
        },
        clipboard: {
          matchVisual: false,
        },
      }),
      [],
    );

    const handleChange = useCallback(
      (content, delta, source, editor) => {
        if (maxLength && editor?.getLength) {
          const textLength = editor.getLength() - 1;
          if (textLength <= maxLength) {
            onChange(content);
          }
        } else {
          onChange(content);
        }
      },
      [onChange, maxLength],
    );

    const characterCount = useMemo(() => {
      if (!value || !maxLength) return null;
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = value;
      return tempDiv.textContent?.length || 0;
    }, [value, maxLength]);

    return (
      <div className={`text-editor-wrapper w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <div
            className={`
            border rounded-lg overflow-hidden
            ${error ? "border-red-500" : "border-gray-300"}
            ${readOnly ? "bg-gray-50" : "bg-white"}
            focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500
          `}
            style={{ minHeight: height }}
          >
            <ReactQuill
              ref={quillRef}
              theme={theme}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              readOnly={readOnly}
              modules={modules}
              formats={FORMATS}
              style={{ minHeight: height }}
            />
          </div>

          {maxLength && (
            <div className="flex justify-end mt-1">
              <span
                className={`text-xs ${characterCount > maxLength * 0.9 ? "text-red-500" : "text-gray-500"}`}
              >
                {characterCount}/{maxLength}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

        <style jsx>{`
          .text-editor-wrapper :global(.ql-editor) {
            min-height: ${height};
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            padding: 12px 15px;
          }

          .text-editor-wrapper :global(.ql-toolbar) {
            border-bottom: 1px solid #e5e7eb;
          }

          .text-editor-wrapper :global(.ql-container) {
            border: none;
          }

          .text-editor-wrapper :global(.ql-editor.ql-blank::before) {
            color: #9ca3af;
            font-style: normal;
          }
        `}</style>
      </div>
    );
  },
);

TextEditor.displayName = "TextEditor";
