import React, { useMemo, useRef, useState } from "react";
import { MdFileDownload, MdFileUpload } from "react-icons/md";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";
import DefaultMiddleModal from "../Atoms/Modal/DefaultMiddleModal ";
import Input from "../Atoms/Input/Input";
import {
  exportToCsv,
  exportToExcel,
  exportToExcelWorkbook,
  findDuplicateRows,
  parseImportFile,
} from "../../_helpers/exportToCsv";
import { getRouteModuleCandidates } from "../../_helpers/rbacRoutes";

const MaybeGuard = ({ module, action, scope = "any", children }) => {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = module || inferredModule;
  return guardModule ? (
    <PermissionGuard module={guardModule} action={action} scope={scope} hide>
      {children}
    </PermissionGuard>
  ) : (
    children
  );
};

export const ExportButton = ({
  data = [],
  selectedData = [],
  columns = [],
  filename = "export",
  format = "csv",
  requiredModule,
  requiredAction = "export",
  requiredScope = "any",
  label,
  onClick,
  onExport,
  workbookTitle = "Export Report",
  sheetName = "Data",
}) => {
  const rows = selectedData.length ? selectedData : data;

  const exportRows = async () => {
    if (!rows.length) {
      toast.error("No records available to export");
      return;
    }

    // Custom export takes precedence when supplied.
    const customExport = onExport || onClick;

    if (customExport) {
      await customExport(rows, columns);
      return;
    }

    try {
      const filenameWithExtension = `${filename}.${format === "excel" ? "xlsx" : "csv"}`;

      if (format === "excel") {
        const exported = exportToExcelWorkbook(
          [
            {
              name: sheetName,
              title: workbookTitle,
              data: rows,
              columns,
            },
          ],
          filenameWithExtension,
        );

        if (exported === false) {
          toast.error("Unable to export Excel workbook");
          return;
        }
      } else {
        exportToCsv(rows, {
          filename: filenameWithExtension,
          columns,
        });
      }

      toast.success(
        `${rows.length} record${rows.length === 1 ? "" : "s"} exported`,
      );
    } catch (error) {
      toast.error(error?.message || "Failed to export records");
    }
  };

  return (
    <MaybeGuard
      module={requiredModule}
      action={requiredAction}
      scope={requiredScope}
    >
      <button
        type="button"
        onClick={exportRows}
        className="admin-btn-secondary"
      >
        <MdFileDownload aria-hidden="true" size={17} />
        {label || "Export"}
      </button>
    </MaybeGuard>
  );
};

export const ImportButton = ({
  onImport,
  onClick,
  importing = false,
  validateRow,
  duplicateKey,
  requiredModule,
  requiredAction = "import",
  requiredScope = "any",
  label = "Import",
  templateRows = [],
  templateFilename = "import-template",
}) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const duplicateRows = useMemo(
    () => findDuplicateRows(rows, duplicateKey),
    [duplicateKey, rows],
  );

  const handleImportClick = () => {
    if (loading || importing) return;
    fileInputRef.current?.click();
  };

  const readFile = async (event) => {
    const input = event.target;
    const selectedFile = input.files?.[0];

    // Allow selecting the same file again.
    input.value = "";

    if (!selectedFile) return;

    const importHandler = onImport || onClick;

    if (typeof importHandler !== "function") {
      toast.error("Import handler is not configured.");
      return;
    }

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(extension)) {
      toast.error("Please select a CSV or Excel file.");
      return;
    }

    setLoading(true);

    try {
      const parsedRows = await parseImportFile(selectedFile);

      if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
        toast.error("The selected file contains no importable rows.");
        return;
      }

      const rowErrors = validateRow
        ? parsedRows.flatMap((row, index) => {
            try {
              const error = validateRow(row, index);

              return error
                ? [
                    {
                      row: index + 2,
                      message:
                        typeof error === "string" ? error : "Invalid row",
                    },
                  ]
                : [];
            } catch (error) {
              return [
                {
                  row: index + 2,
                  message: error?.message || "Invalid row",
                },
              ];
            }
          })
        : [];

      setRows(parsedRows);

      if (rowErrors.length > 0) {
        toast.error(`Import cancelled: ${rowErrors.length} invalid row(s).`);
        console.error("Import validation errors:", rowErrors);
        return;
      }

      const duplicates = findDuplicateRows(parsedRows, duplicateKey);

      if (duplicates.length > 0) {
        toast.error(`Import cancelled: ${duplicates.length} duplicate row(s).`);
        return;
      }

      // Call the existing Special Price Management import handler.
      await importHandler(parsedRows, selectedFile);

      toast.success(
        `${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} imported successfully.`,
      );
    } catch (error) {
      console.error("Special price import failed:", error);
      toast.error(error?.message || "Failed to import the selected file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaybeGuard
      module={requiredModule}
      action={requiredAction}
      scope={requiredScope}
    >
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={readFile}
          style={{ display: "none" }}
          aria-label="Select a CSV or Excel file to import"
        />

        <button
          type="button"
          className="admin-btn-secondary"
          onClick={handleImportClick}
          disabled={loading || importing}
        >
          <MdFileUpload aria-hidden="true" size={17} />
          {loading || importing ? "Importing..." : label}
        </button>
      </>
    </MaybeGuard>
  );
};
