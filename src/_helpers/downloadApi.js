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
  const response = await axiosPrivate.get(endpoint, {
    params,
    responseType: "blob",
  });
  const format = params?.format || options.format || "pdf";
  const filename =
    options.filename ||
    filenameFromDisposition(response.headers?.["content-disposition"]) ||
    fallbackName(endpoint, format);

  downloadBlob(response.data, filename);
  return { filename };
};
