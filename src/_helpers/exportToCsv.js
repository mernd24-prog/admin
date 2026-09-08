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

export const exportToCsvSections = (
  sections = [],
  filename = "export.csv",
) => {
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

  sheets.forEach(
    ({
      name,
      data = [],
      columns = [],
      cellStyles = {},
    }) => {
      const normalizedRows = normalizeExportRows(
        data,
        columns,
      );

      /*
       * =====================================
       * HEADERS
       * =====================================
       */

      const headers = columns
        .filter(
          (column) =>
            column.exportable !== false,
        )
        .map(
          (column) =>
            column.label || column.key,
        );

      /*
       * =====================================
       * DATA ROWS
       * =====================================
       */

      const dataRows = normalizedRows.map(
        (row) =>
          headers.map(
            (header) => row[header],
          ),
      );

      /*
       * =====================================
       * CREATE WORKSHEET
       *
       * Row 1 -> Header
       * Row 2 -> Blank
       * Row 3+ -> Data
       * =====================================
       */

      const worksheet = XLSX.utils.aoa_to_sheet([
        headers,
        [],
        ...dataRows,
      ]);

      /*
       * =====================================
       * HEADER STYLE
       * =====================================
       */

      headers.forEach(
        (header, columnIndex) => {
          const cellRef =
            XLSX.utils.encode_cell({
              r: 0,
              c: columnIndex,
            });

          const cell = worksheet[cellRef];

          if (!cell) return;

          cell.s = {
            font: {
              bold: true,
              sz: 11,
            },

            fill: {
              patternType: "solid",
              fgColor: {
                rgb: "FFF3D6",
              },
            },

            alignment: {
              horizontal: "center",
              vertical: "center",
            },

            border: {
              top: {
                style: "thin",
                color: {
                  rgb: "FFD6A3",
                },
              },

              bottom: {
                style: "thin",
                color: {
                  rgb: "FFD6A3",
                },
              },

              left: {
                style: "thin",
                color: {
                  rgb: "FFD6A3",
                },
              },

              right: {
                style: "thin",
                color: {
                  rgb: "FFD6A3",
                },
              },
            },
          };
        },
      );

      /*
       * =====================================
       * DATA CELL BASE STYLE
       *
       * Keep all data values left aligned.
       * This prevents numbers from being
       * automatically right aligned.
       * =====================================
       */

      dataRows.forEach(
        (row, rowIndex) => {
          row.forEach(
            (value, columnIndex) => {
              const cellRef =
                XLSX.utils.encode_cell({
                  r: rowIndex + 2,
                  c: columnIndex,
                });

              const cell =
                worksheet[cellRef];

              if (!cell) return;

              cell.s = {
                alignment: {
                  horizontal: "left",
                  vertical: "center",
                },
              };
            },
          );
        },
      );

      /*
       * =====================================
       * CUSTOM CELL STYLES
       *
       * Example:
       * Status -> In Stock / Low Stock /
       *           Out of Stock
       *
       * Merge the custom style with the
       * default left alignment.
       * =====================================
       */

      Object.entries(cellStyles).forEach(
        ([columnLabel, stylesByValue]) => {
          const columnIndex =
            columns.findIndex(
              (column) =>
                (column.label ||
                  column.key) ===
                columnLabel,
            );

          if (columnIndex < 0) return;

          data.forEach(
            (row, rowIndex) => {
              /*
               * Row 1 = Header
               * Row 2 = Blank
               * Row 3 = First data row
               *
               * Therefore:
               * rowIndex + 2
               */

              const cellRef =
                XLSX.utils.encode_cell({
                  r: rowIndex + 2,
                  c: columnIndex,
                });

              const cell =
                worksheet[cellRef];

              if (!cell) return;

              const value =
                getExportValue(
                  row,
                  columns[columnIndex],
                );

              const customStyle =
                stylesByValue[value];

              if (!customStyle) return;

              /*
               * Keep left alignment even
               * when custom status styling
               * is applied.
               */

              cell.s = {
                alignment: {
                  horizontal: "left",
                  vertical: "center",
                },

                ...customStyle,

                /*
                 * Make sure custom style
                 * cannot remove alignment.
                 */
                alignment: {
                  horizontal: "left",
                  vertical: "center",
                  ...(customStyle.alignment ||
                    {}),
                },
              };
            },
          );
        },
      );

      /*
       * =====================================
       * DYNAMIC COLUMN WIDTH
       *
       * Width is calculated from the
       * longest value in each column.
       * =====================================
       */

      worksheet["!cols"] = headers.map(
        (header, columnIndex) => {
          const headerLength =
            String(
              header || "",
            ).length;

          const dataLength =
            dataRows.reduce(
              (maxLength, row) => {
                const value =
                  row[columnIndex];

                return Math.max(
                  maxLength,
                  String(
                    value ?? "",
                  ).length,
                );
              },
              0,
            );

          /*
           * Add 3 characters of padding.
           *
           * Minimum width = 12
           * Maximum width = 35
           */

          const width =
            Math.max(
              headerLength,
              dataLength,
            ) + 3;

          return {
            wch: Math.min(
              35,
              Math.max(12, width),
            ),
          };
        },
      );

      /*
       * =====================================
       * ROW HEIGHT
       * =====================================
       */

      worksheet["!rows"] = [
        {
          hpt: 22,
        },
        {
          hpt: 8,
        },
      ];

      /*
       * =====================================
       * FREEZE HEADER + BLANK ROW
       *
       * Row 1 -> Header
       * Row 2 -> Blank
       * Data starts from Row 3
       * =====================================
       */

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 2,
      };

      /*
       * =====================================
       * APPEND SHEET
       * =====================================
       */

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        name,
      );
    },
  );

  /*
   * =====================================
   * WRITE EXCEL FILE
   * =====================================
   */

  XLSXStyle.writeFile(
    workbook,
    filename,
  );

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
