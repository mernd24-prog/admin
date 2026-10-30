import React, { useMemo, useCallback, useRef, useEffect } from "react";
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

const getPlainText = (html = "") => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || "";
};

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
    limitMessage = "Maximum characters allowed.",
    showErrorBorder = true,
  }) => {
    const quillRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const lastValidValueRef = useRef(value);
    const restoringRef = useRef(false);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Sync external changes such as Formik resetForm().
    useEffect(() => {
      if (restoringRef.current) {
        restoringRef.current = false;
        return;
      }

      const length = getPlainText(value).length;

      if (!maxLength || length <= maxLength) {
        lastValidValueRef.current = value;
      }
    }, [value, maxLength]);

    const characterCount = useMemo(() => getPlainText(value).length, [value]);

    const limitReached = Boolean(maxLength && characterCount >= maxLength);

    const modules = useMemo(
      () => ({
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: {
            image: function () {
              const input = document.createElement("input");

              input.type = "file";
              input.accept = "image/jpeg,image/png,image/webp";
              input.click();

              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;

                try {
                  const url = await uploadFile(file, "CMS");
                  const quill = quillRef.current?.getEditor();

                  if (quill) {
                    const range = quill.getSelection(true);
                    if (!range) return;

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

    // Enforce the limit before accepting user edits.
    useEffect(() => {
      const quill = quillRef.current?.getEditor();

      if (!quill || !maxLength) return;

      const editorElement = quill.root;

      const getSelectionInfo = () => {
        const selection = quill.getSelection();

        if (!selection) return null;

        const currentLength = quill.getText().replace(/\n$/, "").length;

        const selectedText = quill
          .getText(selection.index, selection.length)
          .replace(/\n$/, "");

        return {
          selection,
          currentLength,
          selectedLength: selectedText.length,
          available: Math.max(
            0,
            maxLength - (currentLength - selectedText.length),
          ),
        };
      };

      const handleBeforeInput = (event) => {
        if (readOnly || event.isComposing) return;

        const info = getSelectionInfo();
        if (!info) return;

        const isInsertion = event.inputType?.startsWith("insert");

        if (!isInsertion) return;

        // Block insertion when no characters remain.
        if (info.available <= 0 && info.selection.length === 0) {
          event.preventDefault();
          return;
        }

        // Limit text insertion to the remaining available characters.
        if (
          event.inputType === "insertText" &&
          typeof event.data === "string" &&
          event.data.length > info.available
        ) {
          event.preventDefault();

          const allowedText = event.data.slice(0, info.available);

          if (allowedText) {
            quill.insertText(info.selection.index, allowedText, "user");

            quill.setSelection(
              info.selection.index + allowedText.length,
              0,
              "silent",
            );
          }
        }
      };

      const handlePaste = (event) => {
        if (readOnly) return;

        const pastedText = event.clipboardData?.getData("text/plain");

        if (pastedText == null) return;

        const info = getSelectionInfo();
        if (!info) return;

        event.preventDefault();

        const allowedText = pastedText.slice(0, info.available);

        if (allowedText || info.selection.length > 0) {
          quill.deleteText(info.selection.index, info.selection.length, "user");

          if (allowedText) {
            quill.insertText(info.selection.index, allowedText, "user");
          }

          quill.setSelection(
            info.selection.index + allowedText.length,
            0,
            "silent",
          );
        }
      };

      // Safety guard for edits that bypass beforeinput.
      const handleTextChange = (_delta, _oldDelta, source) => {
        if (source !== "user" || restoringRef.current) return;

        const currentHtml = quill.root.innerHTML;
        const currentLength = quill.getText().replace(/\n$/, "").length;

        if (currentLength <= maxLength) {
          lastValidValueRef.current = currentHtml;
          onChangeRef.current?.(currentHtml);
          return;
        }

        restoringRef.current = true;

        const previousHtml = lastValidValueRef.current;

        quill.setContents(
          quill.clipboard.convert({ html: previousHtml }),
          "silent",
        );

        onChangeRef.current?.(previousHtml);

        Promise.resolve().then(() => {
          restoringRef.current = false;
        });
      };

      editorElement.addEventListener("beforeinput", handleBeforeInput);
      editorElement.addEventListener("paste", handlePaste);
      quill.on("text-change", handleTextChange);

      return () => {
        editorElement.removeEventListener("beforeinput", handleBeforeInput);
        editorElement.removeEventListener("paste", handlePaste);
        quill.off("text-change", handleTextChange);
      };
    }, [maxLength, readOnly]);

    const handleChange = useCallback(
      (content, _delta, source) => {
        if (maxLength && source === "user") return;

        if (!maxLength) {
          lastValidValueRef.current = content;
        }

        onChangeRef.current?.(content);
      },
      [maxLength],
    );

    return (
      <div className={`text-editor-wrapper w-full ${className}`}>
        {label && (
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <div
            className={`
              text-editor-container
              border
              rounded-lg
              overflow-hidden
              ${
                error && showErrorBorder
                  ? "border-red-500"
                  : "border-[var(--admin-field-line)]"
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

          <div className="flex items-start justify-between gap-3 mt-[6px]">
            <div className="min-w-0">
              {error && <p className="text-red-500 text-xs">{error}</p>}

              {maxLength && limitReached && limitMessage && (
                <p className="text-red-500 text-xs">{limitMessage}</p>
              )}
            </div>

            {maxLength && (
              <span
                className={`shrink-0 text-xs ${
                  limitReached ? "text-red-500" : "text-gray-500"
                }`}
              >
                {characterCount}/{maxLength}
              </span>
            )}
          </div>
        </div>

        {/* {error && <p className="text-red-500 text-xs mt-1">{error}</p>} */}

        <style>{`
          .text-editor-wrapper .text-editor-container {
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          .text-editor-wrapper .text-editor-container:focus-within {
            border-color: #cb9c2d !important;
            box-shadow: 0 0 0 2px rgba(203, 156, 45, 0.12);
          }

          .text-editor-wrapper .ql-toolbar.ql-snow {
            display: block;
            padding: 8px;
            border: none !important;
            border-bottom: 1px solid var(--admin-field-line) !important;
          }

          .text-editor-wrapper .ql-container.ql-snow {
            border: none !important;
          }

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

          .text-editor-wrapper .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }

          .text-editor-wrapper .ql-toolbar button:hover,
          .text-editor-wrapper .ql-toolbar button.ql-active,
          .text-editor-wrapper .ql-toolbar .ql-picker-label:hover,
          .text-editor-wrapper .ql-toolbar .ql-picker-label.ql-active {
            color: #cb9c2d;
          }

          .text-editor-wrapper .ql-toolbar button:hover .ql-stroke,
          .text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
            stroke: #cb9c2d;
          }

          .text-editor-wrapper .ql-toolbar button:hover .ql-fill,
          .text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
            fill: #cb9c2d;
          }
        `}</style>
      </div>
    );
  },
);

TextEditor.displayName = "TextEditor";
