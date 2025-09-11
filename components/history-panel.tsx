"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Trash2, Calendar, CheckSquare, Square, Play } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { StreamType } from "@/app/page"

export interface HistoryItem {
  id: string
  fileName: string
  content: string
  timestamp: number
  type?: string
  stream?: string
  files?: Array<{
    originalName: string
    txtFileName: string
    content: string
  }>
  status?: string
}

interface HistoryPanelProps {
  onSelectHistoryItem?: (item: HistoryItem) => void
  onUseForGeneration?: (items: HistoryItem[], generationType: StreamType) => void
  onGenerateFromHistory?: (items: HistoryItem[], generationType: StreamType) => void
}

export function HistoryPanel({ onSelectHistoryItem, onUseForGeneration, onGenerateFromHistory }: HistoryPanelProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [selectedForGeneration, setSelectedForGeneration] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationType, setGenerationType] = useState<StreamType>("validation")

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

  const handleToggleForGeneration = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedForGeneration)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedForGeneration(newSelected)
  }

  const handleSelectAllForGeneration = () => {
    if (selectedForGeneration.size === historyItems.length) {
      setSelectedForGeneration(new Set()) // Deselect all
    } else {
      setSelectedForGeneration(new Set(historyItems.map(item => item.id))) // Select all
    }
  }

  const handleGenerateFromSelectedItems = async () => {
    const selectedItems = historyItems.filter(item => selectedForGeneration.has(item.id))
    if (selectedItems.length === 0) return

    setIsGenerating(true)
    
    try {
      // If we're using business generation type, check if we have required files
      if (generationType === "business") {
        const hasBusinessDoc = selectedItems.some(item => item.type === "business");
        const hasDetailApi = selectedItems.some(item => item.type === "detail-api");
        
        if (!hasBusinessDoc || !hasDetailApi) {
          alert("Business test generation requires at least one Business Document and one Detail API file.");
          setIsGenerating(false);
          return;
        }
      }
      
      // If onGenerateFromHistory is provided, use that instead of direct API calls
      if (onGenerateFromHistory) {
        onGenerateFromHistory(selectedItems, generationType);
        setSelectedForGeneration(new Set());
        setIsGenerating(false);
        return;
      }
      
      // Call the generation API for each selected item
      for (const item of selectedItems) {
        const endpoint = generationType === "validation" 
          ? "http://localhost:5678/webhook/generate-test-validate"
          : "http://localhost:5678/webhook/gen-test-case-bussiness";
          
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: item.content,
            fileName: item.fileName,
            fileType: item.type || "document",
            stream: generationType,
            fileId: item.id, // Include file ID for tracking
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Handle binary CSV response
        const contentType = response.headers.get("content-type")
        if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
          // Handle as binary data
          const arrayBuffer = await response.arrayBuffer()
          const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
          
          // Download the CSV file
          const blob = new Blob([csvData], { type: "text/csv" })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${item.fileName.replace('.md', '')}_test_cases.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        } else {
          // Handle JSON response or other formats
          try {
            const result = await response.json()
            console.log('Generation result for', item.fileName, result)
            
            let csvData = ""
            
            // Check if response has direct CSV field
            if (result.csv) {
              // Direct CSV response format: { "csv": "csv_content" }
              csvData = result.csv
            } else if (Array.isArray(result) && result.length > 0 && result[0].md) {
              // Process the array format: [{ "md": "data", "file name": ".md" }]
              const markdownData = result[0].md
              const fileName = result[0]["file name"] || item.fileName
              
              csvData = convertMarkdownToCSV(markdownData, fileName)
            } else if (result.csvData) {
              csvData = result.csvData
            } else if (result.data) {
              csvData = result.data
            } else if (result.file) {
              // If response contains file data as base64 or binary
              if (typeof result.file === 'string') {
                try {
                  // Try to decode as base64 first
                  csvData = atob(result.file)
                } catch {
                  csvData = result.file
                }
              }
            }
            
            if (csvData) {
              const blob = new Blob([csvData], { type: "text/csv" })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `${item.fileName.replace('.md', '')}_test_cases.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            } else {
              console.warn('No CSV data found in response for', item.fileName)
            }
          } catch (jsonError) {
            // If it's not JSON, try to handle as binary
            console.log('Response is not JSON, trying to handle as binary CSV')
            const arrayBuffer = await response.arrayBuffer()
            const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
            
            const blob = new Blob([csvData], { type: "text/csv" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${item.fileName.replace('.md', '')}_test_cases.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          }
        }
      }
      
      // Clear selection after successful generation
      setSelectedForGeneration(new Set())
      
    } catch (error) {
      console.error("Generation failed:", error)
      alert(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseSelectedForGeneration = () => {
    const selectedItems = historyItems.filter(item => selectedForGeneration.has(item.id))
    if (selectedItems.length > 0 && onUseForGeneration) {
      onUseForGeneration(selectedItems, generationType)
    }
  }

  const handleDownloadFile = (item: HistoryItem) => {
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
    const newSelectedForGeneration = new Set(selectedForGeneration)
    newSelectedForGeneration.delete(itemId)
    setSelectedForGeneration(newSelectedForGeneration)
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
        
        {/* Generation Controls */}
        {historyItems.length > 0 && (
          <div className="mt-3 p-2 bg-accent/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Generate Test Cases</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllForGeneration}
                className="text-xs h-6 px-2"
              >
                {selectedForGeneration.size === historyItems.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select files to generate test cases ({selectedForGeneration.size} selected)
            </p>
            
            {/* Test Case Generation Type Selection */}
            <div className="p-2 bg-background/50 rounded-md">
              <p className="text-xs font-medium mb-2">Test Case Type:</p>
              <RadioGroup 
                value={generationType}
                onValueChange={(value) => setGenerationType(value as StreamType)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="validation" id="validation" />
                  <Label htmlFor="validation" className="text-xs">Technical Validation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="text-xs">Business Validation</Label>
                </div>
              </RadioGroup>
              
              {generationType === "business" && (
                <p className="text-xs text-amber-600 mt-2">
                  Note: For Business Test Cases, you need Business Document and Detail API files.
                </p>
              )}
            </div>
            
            {selectedForGeneration.size > 0 && (
              <div className="flex flex-col space-y-1">
                <Button
                  onClick={handleGenerateFromSelectedItems}
                  disabled={isGenerating}
                  size="sm"
                  className="w-full h-7 text-xs"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                      Generating...
                    </>
                  ) : (
                    `Generate ${generationType === "business" ? "Business" : "Validation"} CSV (${selectedForGeneration.size})`
                  )}
                </Button>
                <Button
                  onClick={handleUseSelectedForGeneration}
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  className="w-full h-7 text-xs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Use in Generation Step
                </Button>
              </div>
            )}
          </div>
        )}
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
                        {/* Checkbox for generation selection */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleToggleForGeneration(item.id, e)}
                          className="h-5 w-5 p-0"
                          title="Select for generation"
                        >
                          {selectedForGeneration.has(item.id) ? (
                            <CheckSquare className="h-3 w-3 text-primary" />
                          ) : (
                            <Square className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadFile(item)
                          }}
                          className="h-5 w-5 p-0"
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
