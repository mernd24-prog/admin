export const exportSupplierToCSV = (data) => {
  if (!data || data.length === 0) return;

  const csvHeaders = Object.keys(data[0]);
  const csvRows = data.map((row) =>
    csvHeaders.map((field) => `"${row[field] ?? ""}"`).join(",")
  );

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "supplier.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportEnventoryToCsv = (data) => {
  if (!data || data.length === 0) return;

  const csvHeaders = Object.keys(data[0]);
  const csvRows = data.map((row) =>
    csvHeaders.map((field) => `"${row[field] ?? ""}"`).join(",")
  );

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "inventory.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
