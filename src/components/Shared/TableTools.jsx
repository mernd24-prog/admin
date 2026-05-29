import React, { useMemo, useState } from "react";
import { MdFileDownload, MdFileUpload } from "react-icons/md";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";
import DefaultMiddleModal from "../Atoms/Modal/DefaultMiddleModal ";
import Input from "../Atoms/Input/Input";
import { exportToCsv, exportToExcel, findDuplicateRows, parseImportFile } from "../../_helpers/exportToCsv";
import { getRouteModuleCandidates } from "../../_helpers/rbacRoutes";

const MaybeGuard = ({ module, action, children }) => {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = inferredModule || module;
  return guardModule ? <PermissionGuard module={guardModule} action={action} hide>{children}</PermissionGuard> : children;
};

export const ExportButton = ({
  data = [],
  selectedData = [],
  columns = [],
  filename = "export",
  format = "csv",
  requiredModule,
  requiredAction = "export",
  label,
}) => {
  const rows = selectedData.length ? selectedData : data;
  const exportRows = () => {
    if (!rows.length) {
      toast.error("No records available to export");
      return;
    }
    const options = { filename: `${filename}.${format === "excel" ? "xlsx" : "csv"}`, columns };
    if (format === "excel") exportToExcel(rows, options);
    else exportToCsv(rows, options);
    toast.success(`${rows.length} record${rows.length === 1 ? "" : "s"} exported`);
  };

  return (
    <MaybeGuard module={requiredModule} action={requiredAction}>
      <button type="button" onClick={exportRows} className="admin-btn-secondary">
        <MdFileDownload size={17} />
        {label || `Export ${format === "excel" ? "Excel" : "CSV"}`}
      </button>
    </MaybeGuard>
  );
};

export const ImportButton = ({
  onImport,
  validateRow,
  duplicateKey,
  requiredModule,
  requiredAction = "import",
  label = "Import",
  templateRows = [],
  templateFilename = "import-template",
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const duplicateRows = useMemo(() => findDuplicateRows(rows, duplicateKey), [duplicateKey, rows]);

  const readFile = async (event) => {
    const nextFile = event.target.files?.[0] || event.target.value;
    if (!nextFile) return;
    setFile(nextFile);
    try {
      const nextRows = await parseImportFile(nextFile);
      const rowErrors = validateRow
        ? nextRows.flatMap((row, index) => {
            const error = validateRow(row, index);
            return error ? [{ row: index + 2, message: typeof error === "string" ? error : "Invalid row" }] : [];
          })
        : [];
      setRows(nextRows);
      setErrors(rowErrors);
    } catch (error) {
      toast.error(error.message);
      setRows([]);
    }
  };

  const submit = async () => {
    if (errors.length || duplicateRows.length) return;
    setLoading(true);
    try {
      await onImport?.(rows, file);
      toast.success(`${rows.length} rows ready for import`);
      setOpen(false);
      setRows([]);
      setFile(null);
    } catch (error) {
      toast.error(error?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MaybeGuard module={requiredModule} action={requiredAction}>
      <>
        <button type="button" className="admin-btn-secondary" onClick={() => setOpen(true)}>
          <MdFileUpload size={17} /> {label}
        </button>
        <DefaultMiddleModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onSubmit={submit}
          title="Bulk Import"
          loading={loading}
          submitButtonText={loading ? "Importing..." : "Import"}
        >
          <Input type="drag-drop-upload" name="bulkFile" accept=".csv,.xlsx,.xls" onChange={readFile} placeholder="Drop or choose a CSV / Excel file" />
          {templateRows.length > 0 && (
            <button type="button" className="mt-3 text-sm text-primary" onClick={() => exportToExcel(templateRows, { filename: `${templateFilename}.xlsx` })}>
              Download template
            </button>
          )}
          {rows.length > 0 && (
            <div className="admin-import-summary">
              <p>{rows.length} row{rows.length === 1 ? "" : "s"} found</p>
              {duplicateRows.length > 0 && <p className="text-red-600">{duplicateRows.length} duplicate row(s) must be resolved.</p>}
              {errors.slice(0, 5).map((item) => <p key={`${item.row}-${item.message}`} className="text-red-600">Row {item.row}: {item.message}</p>)}
            </div>
          )}
        </DefaultMiddleModal>
      </>
    </MaybeGuard>
  );
};
