import * as XLSX from "xlsx";

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getExportValue = (row, column) => {
  const value = typeof column.value === "function" ? column.value(row) : row[column.key];
  if (typeof column.format === "function") return column.format(value, row);
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : value;
};

export const normalizeExportRows = (data = [], columns = []) => {
  if (!columns.length) return data;
  return data.map((row) =>
    columns.reduce((result, column) => {
      if (column.exportable !== false) result[column.label || column.key] = getExportValue(row, column);
      return result;
    }, {})
  );
};

export const exportToCsv = (data = [], { filename = "export.csv", columns = [] } = {}) => {
  if (!data.length) return false;
  const rows = normalizeExportRows(data, columns);
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
  return true;
};

export const exportToExcel = (data = [], { filename = "export.xlsx", columns = [], sheetName = "Data" } = {}) => {
  if (!data.length) return false;
  const worksheet = XLSX.utils.json_to_sheet(normalizeExportRows(data, columns));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
  return true;
};

export const parseImportFile = async (file) => {
  if (!file) throw new Error("Choose a CSV or Excel file");
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error("Only CSV or Excel files are supported");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
};

export const findDuplicateRows = (rows = [], key) => {
  if (!key) return [];
  const seen = new Set();
  return rows.filter((row) => {
    const value = typeof key === "function" ? key(row) : row[key];
    if (value === undefined || value === "") return false;
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
};

export const exportSupplierToCSV = (data) => exportToCsv(data, { filename: "supplier.csv" });

export const exportEnventoryToCsv = (data) => exportToCsv(data, { filename: "inventory.csv" });
