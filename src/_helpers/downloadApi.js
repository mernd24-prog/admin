import { axiosPrivate } from "./axiosProvider";

const fallbackName = (endpoint = "", format = "pdf") => {
  const clean = String(endpoint || "download")
    .split("?")[0]
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .slice(-2)
    .join("-");
  return `${clean || "download"}.${format || "pdf"}`;
};

const filenameFromDisposition = (disposition = "") => {
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/["]/g, ""));

  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return plainMatch?.[1] || "";
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadApiFile = async (endpoint, params = {}, options = {}) => {
  let response;
  try {
    response = await axiosPrivate.get(endpoint, {
      params,
      responseType: "blob",
    });
  } catch (error) {
    // Download errors arrive as blobs too; decode the API's actual reason.
    let data = error.response?.data;
    if (data && typeof data.text === "function") {
      try { data = JSON.parse(await data.text()); } catch { data = null; }
    }
    const status = error.response?.status;
    const fallback = {
      401: "Your session has expired. Sign in again to download this document.",
      403: "You do not have permission to download this document.",
      404: "This document is no longer available. Refresh the page and try again.",
      409: "This document is not available in the current order or shipment status.",
      429: "Too many download requests. Please try again shortly.",
    }[status];
    error.message = data?.message || data?.error?.message || fallback ||
      (!error.response ? "Unable to reach the server. Check your connection and try again." : "Document generation failed. Please try again.");
    if (error.response) error.response.data = data;
    throw error;
  }
  const format = params?.format || options.format || "pdf";
  const filename =
    options.filename ||
    filenameFromDisposition(response.headers?.["content-disposition"]) ||
    fallbackName(endpoint, format);

  downloadBlob(response.data, filename);
  return { filename };
};
