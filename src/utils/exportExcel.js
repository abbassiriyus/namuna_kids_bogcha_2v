// Shared Excel export helper. `xlsx` is dynamically imported so its ~400KB
// parser/writer never loads into a page's bundle until someone actually exports.
export async function exportToExcel({ headers, rows, filename = 'hisobot', sheetName = 'Sheet1' }) {
  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const columnWidths = headers.map((header, colIndex) => {
    const longest = rows.reduce((max, row) => {
      const value = row[colIndex];
      const length = value === null || value === undefined ? 0 : String(value).length;
      return Math.max(max, length);
    }, String(header ?? '').length);
    return { wch: Math.min(Math.max(longest + 2, 10), 40) };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
