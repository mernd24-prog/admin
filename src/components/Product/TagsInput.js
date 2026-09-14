import React, { useRef, useState } from "react";
import { FiHash } from "react-icons/fi";

/**
 * Multi-tag input with autocomplete suggestions, styled identically to allowed pincodes.
 *
 * Props:
 *  tags        - string[]
 *  onChange    - (tags: string[]) => void
 *  suggestions - string[] (optional)
 *  placeholder - string
 *  maxTags     - number
 */
const TagsInput = ({
  tags = [],
  onChange,
  suggestions = [],
  placeholder = "Add tag…",
  maxTags = 20,
}) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Strip leading # so we don't double-hash
  const normalise = (raw) =>
    raw
      .trim()
      .replace(/^#+/, "") // remove any leading # chars
      .toLowerCase()
      .replace(/\s+/g, "-");

  const filteredSuggestions = input.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s),
      )
    : [];

  const addTag = (raw) => {
    const trimmed = normalise(raw || input);
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
    setInput("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    }
  };

  const atMax = tags.length >= maxTags;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="admin-input w-full"
          placeholder={atMax ? `Max ${maxTags} tags reached` : placeholder}
          value={input}
          disabled={atMax}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />

        {/* ── Autocomplete dropdown ── */}
        {focused && filteredSuggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={() => addTag(s)}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <FiHash size={11} className="text-gray-400" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tags container box (like Allowed Pincodes box) ── */}
      <div className="flex min-h-[34px] flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2">
        {tags.length ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-blue)]/10 px-2 py-1 text-xs font-medium text-[var(--admin-blue)]"
            >
              <FiHash size={10} className="opacity-60" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-sm leading-none hover:text-red-500"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400">No tags added yet.</span>
        )}
      </div>

      {/* ── Helper text ── */}
      <p className="text-xs text-gray-400 select-none">
        Press{" "}
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">
          Enter
        </kbd>{" "}
        or{" "}
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">
          ,
        </kbd>{" "}
        to add ·{" "}
        <span
          className={tags.length >= maxTags ? "text-red-500 font-semibold" : ""}
        >
          {tags.length}/{maxTags}
        </span>{" "}
        tags
      </p>
    </div>
  );
};

export default TagsInput;
