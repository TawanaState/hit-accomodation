import * as XLSX from "xlsx";

export function jsonToSheetWithCaps(data: any[]) {
  if (data.length === 0) return XLSX.utils.json_to_sheet([]);
  const uppercased = data.map(row => {
    const newRow: { [key: string]: any } = {};
    Object.keys(row).forEach(k => {
      newRow[k.toUpperCase()] = row[k];
    });
    return newRow;
  });
  return XLSX.utils.json_to_sheet(uppercased);
}

export function exportToExcel({ data, sheetName, fileName }: { data: any[], sheetName: string, fileName: string }) {
  const ws = jsonToSheetWithCaps(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// Helper to abbreviate programme
export function abbreviateProgramme(programme: string): string {
  if (!programme) return "";
  return programme
    .replace(/^(BTECH|BSC|BENG|BBA|MSC|MBA|DIPLOMA|HONOURS|POSTGRADUATE|UNDERGRADUATE|CERTIFICATE|ADVANCED|\s)+/gi, "")
    .split(/\s+|_+/)
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .toUpperCase();
} 