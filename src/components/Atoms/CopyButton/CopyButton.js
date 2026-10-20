import { useEffect, useRef, useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";
import { toast } from "sonner";
import { copyTextToClipboard } from "../../../utils/clipboard";

const CopyButton = ({
  value,
  label = "Item",
  onCopy,
  className = "",
  size = 16,
}) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleCopy = async () => {
    if (value == null || value === "") return;

    try {
      if (onCopy) {
        await onCopy(value);
      } else if (!(await copyTextToClipboard(value))) {
        throw new Error("Clipboard copy failed");
      }

      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1800);
      if (!onCopy) toast.success(`${label} copied`);
    } catch {
      if (!onCopy) toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  if (value == null || value === "") return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      // className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
    >
      {copied ? (
        <MdCheck aria-hidden="true" size={size} className="text-emerald-600" />
      ) : (
        <MdContentCopy aria-hidden="true" size={size} />
      )}
    </button>
  );
};

export default CopyButton;
