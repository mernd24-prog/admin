import { toast } from "../utils/toast";
import { formatDate as _formatDate, formatDateTime as _formatDateTime } from "../utils/formatters";
import { apiRequestImage } from "./apiConfig";
import { useState } from "react";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { FiAlertCircle } from "react-icons/fi";
import { FaRegFileAlt } from "react-icons/fa";

const keyData = "EcomAdmin";

// Session Storage Functions
export const sessionStorageSetItem = (item) => {
  return sessionStorage.setItem(keyData, JSON.stringify(item));
};

export const sessionStorageGetItem = () => {
  const data = window.sessionStorage.getItem(keyData);
  return data ? JSON.parse(data) : null;
};

export const sessionStorageRemoveItem = () => {
  sessionStorage.removeItem(keyData);
};

// Local Storage Functions
export const localStorageSetItem = (item) => {
  localStorage.setItem(keyData, JSON.stringify(item));
};

export const localStorageGetItem = () => {
  const data = localStorage.getItem(keyData);
  return data ? JSON.parse(data) : null;
};

export const localStorageRemoveItem = () => {
  localStorage.removeItem(keyData);
};

// Helper Functions
export const getAuthToken = () => {
  const sessionData = sessionStorageGetItem();
  return sessionData?.token || null;
};

export const getRefreshToken = () => {
  const sessionData = sessionStorageGetItem();
  return sessionData?.refreshToken || null;
};

export const getUserEmail = () => {
  const sessionData = sessionStorageGetItem();
  return sessionData?.email || null;
};

export const getUserId = () => {
  const sessionData = sessionStorageGetItem();
  return sessionData?.userId || null;
};

export const getUserRole = () => {
  const sessionData = sessionStorageGetItem();
  return sessionData?.roleId || null;
};

export const getRandomHexColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

export const maskEmail = (email = "") => {
  if (!email) {
    const sessionEmail = getUserEmail();
    if (!sessionEmail) return "";
    email = sessionEmail;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  const visibleChars = 2;
  const maskedPart = "*".repeat(Math.max(localPart.length - visibleChars, 1));

  return `${localPart.slice(0, visibleChars)}${maskedPart}@${domain}`;
};

export const formatChatDate = (sentAt) => {
  const messageDate = new Date(sentAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = messageDate.toDateString() === today.toDateString();
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();
  const isThisWeek = messageDate > new Date(today.setDate(today.getDate() - today.getDay()));

  if (isToday) return `Today`;
  if (isYesterday) return `Yesterday`;
  if (isThisWeek) {
    return `${messageDate.toLocaleDateString("en-US", { weekday: "long" })}`;
  }

  return messageDate.toLocaleDateString("en-GB");
};

export const uploadFile = async (file, moduleName = 'DEFAULT') => {
  if (!file) throw new Error('No file provided');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('module', moduleName);

  try {
    const response = await apiRequestImage('POST', '/file-uploader/upload', formData);
    const payload = response?.data || response || {};
    const imageURL =
      payload?.imageURL ||
      payload?.url ||
      payload?.image?.imageURL ||
      payload?.image?.url;

    if (!imageURL) {
      throw new Error("Upload response did not include an image URL");
    }

    return imageURL;
  } catch (error) {
    throw error.message || 'Upload failed';
  }
};

export const uploadFileMulti = async (files, moduleName = 'DEFAULT') => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('file', file); // 'files' should match the backend field name
  }
  formData.append('module', moduleName);

  try {
    const response = await apiRequestImage('POST', '/file-uploader/upload-multi', formData);
    const payload = response?.data || response || {};
    const imageURLs =
      payload?.imageURLs ||
      payload?.images?.map((image) => image?.imageURL || image?.url).filter(Boolean) ||
      [];

    if (!imageURLs.length) {
      throw new Error("Upload response did not include image URLs");
    }

    return imageURLs;
  } catch (error) {
    throw error?.message || 'Upload failed';
  }
};

export const uploadDocumentFile = async (file, moduleName = 'DEFAULT') => {
  if (!file) throw new Error('No file provided');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('module', moduleName);
  formData.append('type', 'catalog-document');

  try {
    const response = await apiRequestImage('POST', '/file-uploader/upload-document', formData);
    const payload = response?.data || response || {};
    const documentURL =
      payload?.documentURL ||
      payload?.url ||
      payload?.document?.documentURL ||
      payload?.document?.url;

    if (!documentURL) {
      throw new Error("Upload response did not include a document URL");
    }

    return documentURL;
  } catch (error) {
    throw error?.message || 'Upload failed';
  }
};

export const uploadCsvFile = async (files) => {
  if (!files) throw new Error('No file provided');

  let { seller_id, store_id, file } = files

  const formData = new FormData();
  formData.append('file', file);
  formData.append('seller_id', seller_id);
  formData.append('store_id', store_id);
  try {
    const response = await apiRequestImage('POST', '/product/upload-product-csv', formData);
    return response?.data?.imageURL;
  } catch (error) {
    throw error.message || 'Upload failed';
  }
};


export const transformArray = (data) => {
  return Array.isArray(data) && data.map(item => {
    const code = item?.code || item?.batchCode || '';
    const igst = item?.IGST ?? 0;
    const cgst = item?.CGST ?? 0;
    const sgst = item?.SGST ?? 0;
    const additionalTax = item?.additionalTax ?? 0;

    return {
      value: item?._id || item?.id,
      label: item?.userName
        ? `${item.userName} (${item.email || ''})`
        : item?.name ||
          item?.period ||
          item?.dimensions_value ||
          item?.replace_policy ||
          item?.duration ||
          item?.batchCode ||
          `${code} | IGST: ${igst}% | CGST: ${cgst}% | SGST: ${sgst}% | Add. Tax: ${additionalTax}%`
    };
  });
};



export const validateFiles = (files) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const validFiles = [];

  for (const f of files) {
    if (!allowedTypes.includes(f.type)) {
      toast.error(`${f.name} is not a valid image. Only PNG, JPG, and WEBP are allowed.`);
      continue;
    }
    if (f.size > maxSize) {
      toast.error(`${f.name} is too large. Maximum size is 5MB.`);
      continue;
    }
    validFiles.push(f);
  }

  return validFiles;
};

export const validateDocumentFiles = (files) => {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024;
  const validFiles = [];

  for (const f of files) {
    if (!allowedTypes.includes(f.type)) {
      toast.error(`${f.name} is not a supported document. Use PDF, PNG, JPG, or WEBP.`);
      continue;
    }
    if (f.size > maxSize) {
      toast.error(`${f.name} is too large. Maximum size is 10MB.`);
      continue;
    }
    validFiles.push(f);
  }

  return validFiles;
};
export const roleBasedAccess = () => {
  return [
    { label: 'user', value: 5 },
    { label: 'seller', value: 3 }
  ];
};

export const roleBasedAccess2 = () => {
  return [
    { label: 'user', value: 5 },
    { label: 'seller', value: 3 },
    { label: 'Delivery Partner', value: 8 },


  ];
};
export const roles = {
  5: "User",
  3: "Seller"
}
/** @deprecated Use formatDate / formatDateTime from utils/formatters instead */
export const formatDateForDisplay = (timestamp, includeTime = false) => {
  return includeTime ? _formatDateTime(timestamp) : _formatDate(timestamp);
};

export const generateCSV = (data, options) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data provided for CSV generation');
    }

    // Get headers from first object if not provided
    const headers = options.headers || Object.keys(data[0]);

    // Filter out excluded keys
    const filteredHeaders = headers.filter(header =>
      !options.excludeKeys?.includes(header)
    );

    // CSV content generation
    let csvContent = '';

    // Add headers
    csvContent += filteredHeaders.map(header => `"${header}"`).join(',') + '\r\n';

    // Add rows
    data.forEach(item => {
      const row = filteredHeaders.map(header => {
        let value = item[header];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        value = String(value).replace(/"/g, '""');

        return `"${value}"`;
      });

      csvContent += row.join(',') + '\r\n';
    });

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', options.filename || 'export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
};


export const DownloadExcelButton = ({
  fileUrl,
  fileName = 'validation_errors.xlsx',
  isError = false,
  isDataAvailable = true
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      if (!isDataAvailable) {
        alert('No Data Found for download.');
        return;
      }
      if (!fileUrl) {
        alert('No file URL available to download.');
        return;
      }

      setIsDownloading(true);
      const response = await fetch(fileUrl);

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        alert('No data available to download.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const headers = Object.keys(data[0]);
      // Add "Errors" column at the end
      const excelHeaders = [...headers, 'Errors'];
      const excelData = [excelHeaders];
      const errorCells = [];
      const errorSummary = []; // Store error details for summary sheet

      data.forEach((item, rowIndex) => {
        const row = [];
        const rowErrors = []; // Store all errors for this row

        headers.forEach((header, colIndex) => {
          const field = item[header];
          let value = '';
          if (field && typeof field === 'object' && 'value' in field) {
            value = field.value ?? '';
            if (field.error && field.color === 'red') {
              value = `ERROR: ${value}`;
              errorCells.push({
                row: rowIndex + 1,
                col: colIndex,
                error: field.error
              });

              rowErrors.push(`${header}: ${field.error}`);

              errorSummary.push({
                rowNumber: rowIndex + 2,
                column: header,
                cellValue: value,
                errorMessage: field.error
              });
            }
          } else {
            value = field ?? '';
          }
          row.push(value);
        });

        row.push(rowErrors.join('\n'));
        excelData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      errorCells.forEach(({ row, col }) => {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = {
          font: {
            color: { rgb: 'FFFF0000' },
            bold: true
          }
        };
      });

      const errorsHeaderRef = XLSX.utils.encode_cell({ r: 0, c: headers.length });
      if (!ws[errorsHeaderRef]) ws[errorsHeaderRef] = {};
      ws[errorsHeaderRef].s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: 'FFFFCCCC' }
        },
        font: {
          bold: true,
          color: { rgb: 'FF000000' }
        }
      };

      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      ws['!cols'].push({ wch: 40 });

      // Add main data sheet
      XLSX.utils.book_append_sheet(wb, ws, 'Data');

      if (errorSummary.length > 0) {
        const errorHeaders = ['Row Number', 'Column', 'Cell Value', 'Error Message'];
        const errorSheetData = [errorHeaders];

        errorSummary.forEach(error => {
          errorSheetData.push([
            error.rowNumber,
            error.column,
            error.cellValue,
            error.errorMessage
          ]);
        });

        const errorWs = XLSX.utils.aoa_to_sheet(errorSheetData);
        errorHeaders.forEach((header, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
          if (!errorWs[cellRef]) errorWs[cellRef] = {};
          errorWs[cellRef].s = {
            fill: {
              patternType: 'solid',
              fgColor: { rgb: 'FFD9534F' }
            },
            font: {
              bold: true,
              color: { rgb: 'FFFFFFFF' }
            }
          };
        });

        errorWs['!cols'] = [
          { wch: 12 }, // Row Number
          { wch: 20 }, // Column
          { wch: 25 }, // Cell Value
          { wch: 40 }  // Error Message
        ];

        XLSX.utils.book_append_sheet(wb, errorWs, 'Error Summary');
      }

      const excelBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true
      });

      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      saveAs(blob, fileName);

      if (errorSummary.length > 0) {
        alert(`Excel file downloaded successfully!\n${errorSummary.length} validation errors found. Check the "Error Summary" sheet for details.`);
      } else {
        alert('Excel file downloaded successfully!');
      }

    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`inline-flex items-center px-3 py-1 text-xs font-medium transition-colors ${isDownloading
        ? 'text-gray-400 cursor-not-allowed'
        : isError
          ? 'text-red-600 hover:text-red-800'
          : 'text-blue-600 hover:text-blue-800'
        }`}
      title={
        isDownloading
          ? 'Downloading...'
          : isError
            ? 'Download Excel with error highlights and summary'
            : 'Download Excel file'
      }
    >
      {isDownloading ? (
        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      ) : isError ? (
        <FiAlertCircle className="w-4 h-4 text-red-600" />
      ) : (
        <FaRegFileAlt className="w-4 h-4 text-blue-600" />
      )}
    </button>
  );
};
