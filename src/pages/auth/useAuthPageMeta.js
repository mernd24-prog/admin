import { useEffect } from "react";

const DEFAULT_TITLE = "Sam Global";

const ensureDescriptionMeta = () => {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  return meta;
};

export const useAuthPageMeta = (title, description) => {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previousTitle = document.title;
    const meta = ensureDescriptionMeta();
    const previousDescription = meta.getAttribute("content") || "";

    document.title = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    if (description) {
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      meta.setAttribute("content", previousDescription);
    };
  }, [description, title]);
};
