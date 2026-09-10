import React, { useMemo, useState } from "react";

export const getShowMoreText = (value, options = {}) => {
  const text = String(value ?? "");
  const mode = options.mode || "characters";
  const limit = Number(options.limit ?? (mode === "words" ? 25 : 150));

  if (!text || limit <= 0) {
    return {
      text: "",
      preview: "",
      isTruncated: false,
    };
  }

  if (mode === "words") {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const isTruncated = words.length > limit;
    return {
      text,
      preview: isTruncated ? words.slice(0, limit).join(" ").trimEnd() : text,
      isTruncated,
    };
  }

  const characters = Array.from(text);
  const isTruncated = characters.length > limit;
  let preview = text;

  if (isTruncated) {
    const sliced = characters.slice(0, limit).join("").trimEnd();
    preview = sliced.includes(" ")
      ? sliced.substring(0, sliced.lastIndexOf(" "))
      : sliced;
  }

  return {
    text,
    preview,
    isTruncated,
  };
};

export default function ShowMoreText({
  text = "",
  mode = "characters",
  limit = 150,
  moreLabel = "See more",
  lessLabel = "See less",
  className = "",
  textClassName = "",
  buttonClassName = "",
  ellipsis = "...",
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const showMore = useMemo(
    () => getShowMoreText(text, { mode, limit }),
    [text, mode, limit],
  );

  if (!showMore.text) return null;

  const defaultBtnClass =
    "ml-1.5 inline font-bold text-black hover:text-gray-800 hover:underline focus:outline-none transition-colors cursor-pointer text-xs";

  const finalBtnClass = buttonClassName || defaultBtnClass;

  const displayText =
    expanded || !showMore.isTruncated
      ? showMore.text
      : `${showMore.preview}${ellipsis}`;

  return (
    <span className={`inline ${className}`}>
      <span className={`whitespace-pre-line ${textClassName}`}>
        {displayText}
      </span>
      {showMore.isTruncated && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className={finalBtnClass}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </span>
  );
}
