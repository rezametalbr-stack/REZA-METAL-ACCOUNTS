/**
 * Converts an array of objects into a CSV string and triggers a download.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param headers Optional mapping of object keys to display names
 */
export function downloadCSV(data: any[], filename: string, headers?: Record<string, string>) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const keys = Object.keys(headers || data[0]);
  const headerRow = keys.map(key => headers ? headers[key] : key).join(',');

  const csvRows = data.map(row => {
    return keys.map(key => {
      let val = row[key];
      
      // Handle Firebase Timestamps or Dates
      if (val && typeof val === 'object' && val.toDate) {
        val = val.toDate().toLocaleString();
      } else if (val instanceof Date) {
        val = val.toLocaleString();
      }

      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
