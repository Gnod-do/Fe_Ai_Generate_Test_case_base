"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Trash2, Calendar } from "lucide-react"
import type { StreamType } from "@/app/page"

export interface HistoryItem {
  id: string
  fileName: string
  content: string
  timestamp: number
  type?: string
  stream?: string
  csvData?: string // For generated test cases
  isTestCase?: boolean // Flag to distinguish test cases from documents
  originalFileCount?: number // Number of files that generated this test case
}

interface HistoryPanelProps {
  onSelectHistoryItem?: (item: HistoryItem) => void
}

export function HistoryPanel({ onSelectHistoryItem }: HistoryPanelProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  // Helper function to convert markdown tables to CSV
  const convertMarkdownToCSV = (markdown: string, fileName: string = 'test_cases'): string => {
    if (!markdown || typeof markdown !== 'string') {
      return 'Error: No markdown data found or invalid format'
    }

    // Helper function to format JSON strings
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

    // Helper function to clean and format cell content
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

    // Function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return ''
      
      let str = String(value)
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        str = '"' + str.replace(/"/g, '""') + '"'
      }
      
      return str
    }

    // Parse markdown tables
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

    // Convert to CSV
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

  // Load history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const history = localStorage.getItem('conversion-history')
        if (history) {
          const parsedHistory: HistoryItem[] = JSON.parse(history)
          setHistoryItems(parsedHistory)
        }
      } catch (error) {
        console.error('Error loading history:', error)
      }
    }

    loadHistory()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'conversion-history') {
        loadHistory()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleSelectItem = (item: HistoryItem) => {
    setSelectedItem(item.id)
    onSelectHistoryItem?.(item)
  }




  const handleDownloadFile = (item: HistoryItem) => {
    if (item.isTestCase && item.csvData) {
      // For test cases, download CSV with custom filename dialog
      const fileName = prompt(`Enter filename for ${item.fileName}:`, item.fileName.replace('.csv', '') + '.csv')
      if (fileName) {
        const finalFilename = fileName.endsWith('.csv') ? fileName : fileName + '.csv'
        const blob = new Blob([item.csvData], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = finalFilename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } else {
      // For markdown documents, download as before
      const blob = new Blob([item.content], { type: "text/markdown" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.fileName // File already has .md extension
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  const handleDeleteItem = (itemId: string) => {
    const updatedHistory = historyItems.filter(item => item.id !== itemId)
    setHistoryItems(updatedHistory)
    localStorage.setItem('conversion-history', JSON.stringify(updatedHistory))
    
    // Trigger storage event for other components to update
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'conversion-history',
      newValue: JSON.stringify(updatedHistory)
    }))
    
    if (selectedItem === itemId) {
      setSelectedItem(null)
    }

    // Remove from generation selection if it was selected
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTypeBadgeColor = (type?: string) => {
    switch (type) {
      case "api-design": return "bg-blue-100 text-blue-800"
      case "api-detail": return "bg-green-100 text-green-800"
      case "scenario": return "bg-purple-100 text-purple-800"
      case "error": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "api-design": return "API Design"
      case "api-detail": return "API Detail"
      case "scenario": return "Business Scenario"
      case "error": return "Error"
      default: return "Document"
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base">Conversion History</CardTitle>
        <CardDescription className="text-sm">
          Markdown files from your conversions
        </CardDescription>
        
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-3">
            {historyItems.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversion history yet</p>
              </div>
            ) : (
              historyItems
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                      selectedItem === item.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1 min-w-0 flex-1">
                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Badge 
                          variant="secondary" 
                          className={`${getTypeBadgeColor(item.type)} text-xs px-1 py-0 h-5`}
                        >
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadFile(item)
                          }}
                          className="h-5 w-5 p-0"
                          title="Download test cases"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteItem(item.id)
                          }}
                          className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatTimestamp(item.timestamp)}</span>
                      </div>
                      
                      <div className="mt-1">
                        <p className="font-medium text-xs break-words leading-tight" 
                           title={item.fileName}
                           style={{ 
                             display: '-webkit-box',
                             WebkitLineClamp: 2,
                             WebkitBoxOrient: 'vertical',
                             overflow: 'hidden',
                             lineHeight: '1.3',
                             wordBreak: 'break-all'
                           }}>
                          {item.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 break-words" 
                           style={{ 
                             display: '-webkit-box',
                             WebkitLineClamp: 2,
                             WebkitBoxOrient: 'vertical',
                             overflow: 'hidden',
                             lineHeight: '1.3'
                           }}>
                          {item.content.length > 80 
                            ? `${item.content.substring(0, 80)}...` 
                            : item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
