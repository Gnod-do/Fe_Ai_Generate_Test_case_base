import * as XLSX from 'xlsx'

/**
 * Converts CSV data to Excel format and triggers download
 * @param csvData - The CSV data as string
 * @param filename - The desired filename (without extension)
 * @param sheetName - Optional sheet name, defaults to "Test Cases"
 */
export function downloadCSVAsExcel(
  csvData: string, 
  filename: string, 
  sheetName: string = "Test Cases"
): void {
  if (!csvData) {
    console.error('No CSV data provided')
    return
  }

  try {
    // Parse CSV data into array of arrays
    const rows = parseCSVToArray(csvData)
    
    if (rows.length === 0) {
      console.error('No data found in CSV')
      return
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    
    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    
    // Auto-size columns based on content
    const columnWidths = calculateColumnWidths(rows)
    worksheet['!cols'] = columnWidths
    
    // Add some basic formatting
    formatWorksheet(worksheet, rows)
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true 
    })
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(url)
    
    console.log(`Excel file "${filename}.xlsx" downloaded successfully`)
  } catch (error) {
    console.error('Error converting CSV to Excel:', error)
    throw error
  }
}

/**
 * Converts CSV data to Excel buffer for API responses
 * @param csvData - The CSV data as string
 * @param sheetName - Optional sheet name
 * @returns Excel buffer as Uint8Array
 */
export function convertCSVToExcelBuffer(
  csvData: string, 
  sheetName: string = "Test Cases"
): Uint8Array {
  if (!csvData) {
    throw new Error('No CSV data provided')
  }

  try {
    const rows = parseCSVToArray(csvData)
    
    if (rows.length === 0) {
      throw new Error('No data found in CSV')
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    
    // Auto-size columns
    const columnWidths = calculateColumnWidths(rows)
    worksheet['!cols'] = columnWidths
    
    // Add formatting
    formatWorksheet(worksheet, rows)
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    return XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true 
    }) as Uint8Array
  } catch (error) {
    console.error('Error converting CSV to Excel buffer:', error)
    throw error
  }
}

/**
 * Parse CSV string into array of arrays
 * Handles quoted fields and escaped commas
 */
function parseCSVToArray(csvData: string): string[][] {
  const lines = csvData.trim().split('\n')
  const result: string[][] = []
  
  for (const line of lines) {
    if (line.trim() === '') continue
    
    const row: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0
    
    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        row.push(currentField.trim())
        currentField = ''
        i++
      } else {
        currentField += char
        i++
      }
    }
    
    // Add the last field
    row.push(currentField.trim())
    result.push(row)
  }
  
  return result
}

/**
 * Calculate optimal column widths based on content
 */
function calculateColumnWidths(rows: string[][]): Array<{ wch: number }> {
  if (rows.length === 0) return []
  
  const maxCols = Math.max(...rows.map(row => row.length))
  const widths: Array<{ wch: number }> = []
  
  for (let col = 0; col < maxCols; col++) {
    let maxWidth = 10 // Minimum width
    
    for (const row of rows) {
      if (row[col]) {
        const cellWidth = row[col].length
        maxWidth = Math.max(maxWidth, cellWidth)
      }
    }
    
    // Cap maximum width to prevent extremely wide columns
    widths.push({ wch: Math.min(maxWidth + 2, 50) })
  }
  
  return widths
}

/**
 * Apply basic formatting to the worksheet
 */
function formatWorksheet(worksheet: XLSX.WorkSheet, rows: string[][]): void {
  if (rows.length === 0) return
  
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  
  // Format header row (first row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!worksheet[cellAddress]) continue
    
    // Add header formatting
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E6E6FA" } }, // Light lavender background
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    }
  }
  
  // Add borders to data cells
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      if (!worksheet[cellAddress]) continue
      
      worksheet[cellAddress].s = {
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        },
        alignment: { vertical: "top", wrapText: true }
      }
    }
  }
}

/**
 * Utility function to get file size of CSV data for display
 */
export function getCSVFileSize(csvData: string): string {
  const bytes = new Blob([csvData]).size
  
  if (bytes < 1024) {
    return `${bytes} bytes`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * Get file size for Excel file (estimated)
 */
export function getExcelFileSize(csvData: string): string {
  // Excel files are typically 2-3x larger than CSV due to formatting and metadata
  const csvBytes = new Blob([csvData]).size
  const estimatedExcelBytes = csvBytes * 2.5
  
  if (estimatedExcelBytes < 1024) {
    return `~${Math.round(estimatedExcelBytes)} bytes`
  } else if (estimatedExcelBytes < 1024 * 1024) {
    return `~${(estimatedExcelBytes / 1024).toFixed(1)} KB`
  } else {
    return `~${(estimatedExcelBytes / (1024 * 1024)).toFixed(1)} MB`
  }
}