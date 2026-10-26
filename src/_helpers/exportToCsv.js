import * as XLSX from "xlsx";
import * as XLSXStyle from "xlsx-js-style";

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
  const value =
    typeof column.value === "function" ? column.value(row) : row[column.key];
  if (typeof column.format === "function") return column.format(value, row);
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : value;
};

export const normalizeExportRows = (data = [], columns = []) => {
  if (!columns.length) return data;
  return data.map((row) =>
    columns.reduce((result, column) => {
      if (column.exportable !== false)
        result[column.label || column.key] = getExportValue(row, column);
      return result;
    }, {}),
  );
};

export const exportToCsv = (
  data = [],
  { filename = "export.csv", columns = [] } = {},
) => {
  if (!data.length) return false;
  const rows = normalizeExportRows(data, columns);
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ].join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
  return true;
};

export const exportToCsvSections = (sections = [], filename = "export.csv") => {
  if (!sections.length) return false;

  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [];

  sections.forEach(({ title, data = [], columns = [] }, sectionIndex) => {
    if (title) lines.push(escape(title));
    const rows = normalizeExportRows(data, columns);
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      lines.push(headers.map(escape).join(","));
      rows.forEach((row) => {
        lines.push(headers.map((key) => escape(row[key])).join(","));
      });
    }
    if (sectionIndex < sections.length - 1) lines.push("");
  });

  download(
    new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }),
    filename,
  );
  return true;
};

export const exportToExcel = (
  data = [],
  { filename = "export.xlsx", columns = [], sheetName = "Data" } = {},
) => {
  if (!data.length) return false;
  const worksheet = XLSX.utils.json_to_sheet(
    normalizeExportRows(data, columns),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
  return true;
};

export const exportToExcelWorkbook = (
  sheets = [],
  filename = "export.xlsx",
) => {
  if (!sheets.length) return false;

  const workbook = XLSX.utils.book_new();

  // Sam Global theme
  const headerColor = "2E1B78";
  const headerTextColor = "FFFFFF";
  const textColor = "2E1B78";
  const alternateRowColor = "F0EDFA";
  const whiteColor = "FFFFFF";
  const borderColor = "D6A323";

  const baseBorder = {
    top: {
      style: "thin",
      color: { rgb: borderColor },
    },
    bottom: {
      style: "thin",
      color: { rgb: borderColor },
    },
    left: {
      style: "thin",
      color: { rgb: borderColor },
    },
    right: {
      style: "thin",
      color: { rgb: borderColor },
    },
  };

  sheets.forEach(({ name, data = [], columns = [], cellStyles = {} }) => {
    const exportColumns = columns.filter(
      (column) => column.exportable !== false,
    );

    // Add serial number as the first column
    const headers = [
      "S.NO",
      ...exportColumns.map((column) => column.label || column.key),
    ];

    const normalizedRows = normalizeExportRows(data, columns);

    // Generate sequential serial numbers starting from 1
    const dataRows = normalizedRows.map((row, index) => [
      index + 1,
      ...exportColumns.map((column) => {
        const header = column.label || column.key;
        return row[header] ?? "";
      }),
    ]);

    // Row 1: Header
    // Row 2: Blank spacer
    // Row 3 onwards: Data
    const worksheet = XLSX.utils.aoa_to_sheet([headers, [], ...dataRows]);

    // =====================================
    // HEADER FORMATTING
    // =====================================
    headers.forEach((header, columnIndex) => {
      const cellRef = XLSX.utils.encode_cell({
        r: 0,
        c: columnIndex,
      });

      const cell = worksheet[cellRef];
      if (!cell) return;

      cell.s = {
        font: {
          bold: true,
          sz: 11,
          color: { rgb: headerTextColor },
        },
        fill: {
          patternType: "solid",
          fgColor: { rgb: headerColor },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: baseBorder,
      };
    });

    // =====================================
    // DATA CELL FORMATTING
    // =====================================
    dataRows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        const cellRef = XLSX.utils.encode_cell({
          r: rowIndex + 2,
          c: columnIndex,
        });

        const cell = worksheet[cellRef];
        if (!cell) return;

        cell.s = {
          font: {
            sz: 10,
            color: { rgb: textColor },
          },
          fill: {
            patternType: "solid",
            fgColor: {
              rgb: rowIndex % 2 === 1 ? alternateRowColor : whiteColor,
            },
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          border: baseBorder,
        };
      });
    });

    // =====================================
    // CUSTOM CELL STYLES
    // Preserve custom status colors and
    // account for the S.NO column offset.
    // =====================================
    Object.entries(cellStyles).forEach(([columnLabel, stylesByValue]) => {
      const exportColumnIndex = exportColumns.findIndex(
        (column) => (column.label || column.key) === columnLabel,
      );

      if (exportColumnIndex < 0) return;

      // +1 because S.NO occupies column index 0
      const columnIndex = exportColumnIndex + 1;

      normalizedRows.forEach((row, rowIndex) => {
        const cellRef = XLSX.utils.encode_cell({
          r: rowIndex + 2,
          c: columnIndex,
        });

        const cell = worksheet[cellRef];
        if (!cell) return;

        const value = getExportValue(row, exportColumns[exportColumnIndex]);

        const customStyle = stylesByValue[value];
        if (!customStyle) return;

        cell.s = {
          ...cell.s,
          ...customStyle,

          font: {
            ...(cell.s.font || {}),
            ...(customStyle.font || {}),
          },

          fill: customStyle.fill || cell.s.fill,

          border: customStyle.border || cell.s.border,

          alignment: {
            ...(cell.s.alignment || {}),
            ...(customStyle.alignment || {}),
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
        };
      });
    });

    // =====================================
    // DYNAMIC COLUMN WIDTH
    // Minimum: 12
    // Maximum: 40
    // =====================================
    worksheet["!cols"] = headers.map((header, columnIndex) => {
      const headerLength = String(header ?? "").length;

      const dataLength = dataRows.reduce((maxLength, row) => {
        const value = String(row[columnIndex] ?? "");

        const longestLine = Math.max(
          ...value.split("\n").map((line) => line.length),
          0,
        );

        return Math.max(maxLength, longestLine);
      }, 0);

      const width = Math.max(headerLength, dataLength) + 3;

      return {
        wch: Math.min(40, Math.max(12, width)),
      };
    });

    // =====================================
    // ROW HEIGHTS
    // =====================================
    worksheet["!rows"] = [
      { hpt: 30 },
      { hpt: 8 },
      ...dataRows.map((row) => {
        const maxLines = Math.max(
          1,
          ...row.map((value) => String(value ?? "").split("\n").length),
        );

        return {
          hpt: Math.min(60, Math.max(24, maxLines * 16)),
        };
      }),
    ];

    // =====================================
    // FREEZE HEADER + SPACER ROW
    // =====================================
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 2,
    };

    // =====================================
    // FILTERS
    // =====================================
    if (headers.length && dataRows.length) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: {
            r: dataRows.length + 1,
            c: headers.length - 1,
          },
        }),
      };
    }

    // =====================================
    // APPEND WORKSHEET
    // =====================================
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      name || `Sheet${workbook.SheetNames.length + 1}`,
    );
  });

  // =====================================
  // DOWNLOAD EXCEL WORKBOOK
  // =====================================
  XLSXStyle.writeFile(workbook, filename);

  return true;
};

export const parseImportFile = async (file) => {
  if (!file) throw new Error("Choose a CSV or Excel file");
  if (!/\.(csv|xlsx|xls)$/i.test(file.name))
    throw new Error("Only CSV or Excel files are supported");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    defval: "",
  });
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

export const exportSupplierToCSV = (data) =>
  exportToCsv(data, { filename: "supplier.csv" });

export const exportEnventoryToCsv = (data) =>
  exportToCsv(data, { filename: "inventory.csv" });
