export const convertMarkdownToCSV = (markdown: string, fileName: string = 'test_cases'): string => {
  if (!markdown || typeof markdown !== 'string') {
    return 'Error: No markdown data found or invalid format'
  }

  const formatJsonString = (str: string): string => {
    if (!str || typeof str !== 'string') return str
    
    try {
      const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g
      let match
      let formattedParts: string[] = []
      let lastIndex = 0
      
      while ((match = codeBlockRegex.exec(str)) !== null) {
        if (match.index > lastIndex) {
          formattedParts.push(str.substring(lastIndex, match.index))
        }
        
        try {
          const jsonStr = match[1].trim()
          const parsed = JSON.parse(jsonStr)
          const formatted = JSON.stringify(parsed, null, 2)
          formattedParts.push('```json\n' + formatted + '\n```')
        } catch (e) {
          formattedParts.push(match[0])
        }
        
        lastIndex = match.index + match[0].length
      }
      
      if (lastIndex < str.length) {
        formattedParts.push(str.substring(lastIndex))
      }
      
      return formattedParts.length > 0 ? formattedParts.join('') : str
    } catch (error) {
      return str
    }
  }

  const formatCellContent = (content: string, columnName: string): string => {
    if (!content || typeof content !== 'string') return content
    
    let cleaned = content
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (columnName === 'Data test' || columnName === 'Kết quả mong muốn') {
      cleaned = cleaned.replace(/```/g, '\n```')
      cleaned = formatJsonString(cleaned)
      cleaned = cleaned.replace(/Headers:\s*```/g, 'Headers:\n```')
      cleaned = cleaned.replace(/Body:\s*```/g, '\nBody:\n```')
      cleaned = cleaned.replace(/Status Code:/g, '\nStatus Code:')
      cleaned = cleaned.replace(/DB:/g, '\nDB:')
    }
    
    return cleaned.replace(/"/g, '""')
  }

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return ''
    
    let str = String(value)
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      str = '"' + str.replace(/"/g, '""') + '"'
    }
    
    return str
  }

  const tableRegex = /\|(.+?)\|\s*\n\|[-\s:|]+\|\s*\n((?:\|.*\|\s*\n?)+)/g
  const rows: any[] = []
  let match

  while ((match = tableRegex.exec(markdown)) !== null) {
    try {
      const headers = match[1]
        .split('|')
        .map(h => h.trim())
        .filter(h => h.length > 0)
      
      if (headers.length === 0) continue
      
      const bodyLines = match[2]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.includes('|'))
      
      for (const line of bodyLines) {
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter((cell, index, array) => {
            return !(index === 0 && cell === '') && !(index === array.length - 1 && cell === '')
          })
        
        if (cells.length > 0 && cells.some(cell => cell.length > 0)) {
          const rowObj: any = {}
          
          headers.forEach((header, index) => {
            const cellValue = cells[index] || ''
            const formattedValue = formatCellContent(cellValue, header)
            rowObj[header] = formattedValue
          })
          
          if (Object.values(rowObj).some(value => value && String(value).length > 0)) {
            rows.push(rowObj)
          }
        }
      }
    } catch (error) {
      console.error('Error parsing table:', error)
      continue
    }
  }

  if (rows.length === 0) {
    return 'Error: No valid table data found in markdown'
  }

  const headers = Object.keys(rows[0])
  let csv = headers.map(header => escapeCSV(header)).join(',') + '\n'
  
  for (const row of rows) {
    const csvRow = headers.map(header => {
      const value = row[header]
      return escapeCSV(value)
    }).join(',')
    
    csv += csvRow + '\n'
  }

  return csv
}