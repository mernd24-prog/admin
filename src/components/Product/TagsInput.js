import React, { useState } from 'react';

/**
 * Multi-tag input with autocomplete suggestions.
 *
 * Props:
 *  tags       - string[]
 *  onChange   - (tags: string[]) => void
 *  suggestions - string[] (optional)
 *  placeholder - string
 *  maxTags    - number
 */
const TagsInput = ({
  tags = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tag…',
  maxTags = 20,
}) => {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);

  const filteredSuggestions = input.trim()
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s),
      )
    : [];

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] transition-all ${
          focused ? 'border-[var(--admin-blue)] ring-2 ring-[var(--admin-blue)]/20' : 'border-gray-300'
        }`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--admin-blue)] text-white text-xs rounded-full"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-200 ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
          placeholder={tags.length < maxTags ? placeholder : `Max ${maxTags} tags reached`}
          value={input}
          disabled={tags.length >= maxTags}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>

      {focused && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
          {filteredSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
            >
              #{s}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">
        Press Enter or comma to add · {tags.length}/{maxTags} tags
      </p>
    </div>
  );
};

export default TagsInput;
