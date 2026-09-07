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
    showErrorBorder = true,
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
              input.setAttribute(
                "accept",
                "image/jpeg,image/png,image/webp"
              );

              input.click();

              input.onchange = async () => {
                const file = input.files?.[0];

                if (!file) return;

                try {
                  const url = await uploadFile(file, "CMS");

                  const quill = quillRef.current?.getEditor();

                  if (quill) {
                    const range = quill.getSelection(true);

                    quill.insertEmbed(
                      range.index,
                      "image",
                      url
                    );

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
      []
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
      [onChange, maxLength]
    );

    const characterCount = useMemo(() => {
      if (!value || !maxLength) return null;

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = value;

      return tempDiv.textContent?.length || 0;
    }, [value, maxLength]);

    return (
      <div className={`text-editor-wrapper w-full ${className}`}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}

            {required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {/* Editor Container */}
          <div
            className={`
              text-editor-container
              border
              rounded-lg
              overflow-hidden
              ${
                error && showErrorBorder
                  ? "border-red-500"
                  :  "border-[var(--admin-field-line)]"
              }
              ${readOnly ? "bg-gray-50" : "bg-white"}
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

          {/* Character Count */}
          {maxLength && (
            <div className="flex justify-end mt-1">
              <span
                className={`text-xs ${
                  characterCount > maxLength * 0.9
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {characterCount}/{maxLength}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}

        {/* Quill Custom Styles */}
        <style>{`
          /*
           * Outer editor container
           */
          .text-editor-wrapper .text-editor-container {
            transition:
              border-color 0.2s ease,
              box-shadow 0.2s ease;
          }

          /*
           * Gold border + soft gold shadow on focus
           */
          .text-editor-wrapper
            .text-editor-container:focus-within {
            border-color: #cb9c2d !important;
            box-shadow:
              0 0 0 2px rgba(203, 156, 45, 0.12);
          }

          /*
           * Remove Quill's default toolbar border.
           * Keep only the divider between toolbar and editor.
           */
        .text-editor-wrapper .ql-toolbar.ql-snow {
  display: block;
  padding: 8px;
  border: none !important;
  border-bottom: 1px solid var(--admin-field-line) !important;
}

          /*
           * Remove Quill's default editor/container border.
           */
          .text-editor-wrapper .ql-container.ql-snow {
            border: none !important;
            border-top: none !important;
            border-right: none !important;
            border-bottom: none !important;
            border-left: none !important;
          }

          /*
           * Remove any border from the editor area.
           */
          .text-editor-wrapper .ql-editor {
            min-height: ${height};
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            padding: 12px 15px;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }

          .text-editor-wrapper .ql-editor:focus {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }

          /*
           * Extra protection against Quill's default border.
           */
          .text-editor-wrapper .ql-container {
            border: none !important;
          }

          /*
           * Placeholder
           */
          .text-editor-wrapper
            .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }

          /*
           * Toolbar hover / active color
           */
          .text-editor-wrapper .ql-toolbar button:hover,
          .text-editor-wrapper .ql-toolbar button.ql-active,
          .text-editor-wrapper
            .ql-toolbar
            .ql-picker-label:hover,
          .text-editor-wrapper
            .ql-toolbar
            .ql-picker-label.ql-active {
            color: #cb9c2d;
          }

          /*
           * Toolbar icon stroke
           */
          .text-editor-wrapper
            .ql-toolbar
            button:hover
            .ql-stroke,
          .text-editor-wrapper
            .ql-toolbar
            button.ql-active
            .ql-stroke {
            stroke: #cb9c2d;
          }

          /*
           * Toolbar icon fill
           */
          .text-editor-wrapper
            .ql-toolbar
            button:hover
            .ql-fill,
          .text-editor-wrapper
            .ql-toolbar
            button.ql-active
            .ql-fill {
            fill: #cb9c2d;
          }
        `}</style>
      </div>
    );
  }
);

TextEditor.displayName = "TextEditor";