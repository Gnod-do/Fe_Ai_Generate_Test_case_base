"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Play, CheckCircle, AlertCircle, Clock, X, Edit, Trash2, FolderOpen, StopCircle } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface GenerationStepProps {
  uploadedFiles: UploadedFile[]
  selectedStream: StreamType | null
  isGenerating: boolean
  onGenerateTestCases: () => Promise<void>
  onBack: () => void
  onModifyFile?: (fileId: string) => void
  onRemoveFile?: (fileId: string) => void
  onPickFromHistory?: () => void
  onCancelGeneration?: () => void
}

interface GenerationResult {
  fileId: string
  fileName: string
  status: "pending" | "generating" | "completed" | "error"
  csvData?: string
  error?: string
}

export function GenerationStep({ 
  uploadedFiles, 
  selectedStream, 
  isGenerating, 
  onGenerateTestCases,
  onBack,
  onModifyFile,
  onRemoveFile,
  onPickFromHistory,
  onCancelGeneration
}: GenerationStepProps) {
  const [generationResults, setGenerationResults] = useState<GenerationResult[]>([])
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  // Local state to handle selectedStream fallback - initialize with immediate localStorage check
  const [localSelectedStream, setLocalSelectedStream] = useState<StreamType | null>(() => {
    // Try to load from localStorage immediately during initialization
    if (typeof window !== 'undefined') {
      try {
        const storedStream = localStorage.getItem('selectedStream')
        console.log('Initial localStorage check - storedStream:', storedStream)
        if (storedStream && storedStream !== 'null' && storedStream !== '""') {
          const parsedStream = JSON.parse(storedStream) as StreamType
          console.log('Initial localStorage - parsed stream:', parsedStream)
          return parsedStream
        }
      } catch (error) {
        console.error('Error loading selectedStream from localStorage during init:', error)
      }
    }
    return selectedStream
  })

  // Add a second state to track if we've tried localStorage loading
  const [hasTriedLocalStorage, setHasTriedLocalStorage] = useState(false)

  // Effect to handle selectedStream fallback from localStorage
  useEffect(() => {
    console.log('GenerationStep mounted - selectedStream:', selectedStream)
    console.log('GenerationStep mounted - localSelectedStream:', localSelectedStream)
    
    // If both selectedStream prop and localSelectedStream are null, try localStorage again
    if (!selectedStream && !localSelectedStream && !hasTriedLocalStorage && typeof window !== 'undefined') {
      console.log('Both streams are null, re-checking localStorage...')
      setHasTriedLocalStorage(true)
      
      try {
        const storedStream = localStorage.getItem('selectedStream')
        console.log('Re-check stored stream from localStorage:', storedStream)
        
        if (storedStream && storedStream !== 'null' && storedStream !== '""') {
          const parsedStream = JSON.parse(storedStream) as StreamType
          console.log('Re-check: Setting local selectedStream to:', parsedStream)
          setLocalSelectedStream(parsedStream)
        }
      } catch (error) {
        console.error('Error loading selectedStream from localStorage:', error)
      }
    } else if (selectedStream && selectedStream !== localSelectedStream) {
      // Update local state when prop changes
      console.log('Updating localSelectedStream from prop:', selectedStream)
      setLocalSelectedStream(selectedStream)
      setHasTriedLocalStorage(true)
    }
  }, [selectedStream, localSelectedStream, hasTriedLocalStorage])

  // Additional effect to periodically check localStorage until we get a value
  useEffect(() => {
    if (!localSelectedStream && !selectedStream && typeof window !== 'undefined') {
      const interval = setInterval(() => {
        console.log('Periodic localStorage check...')
        try {
          const storedStream = localStorage.getItem('selectedStream')
          if (storedStream && storedStream !== 'null' && storedStream !== '""') {
            const parsedStream = JSON.parse(storedStream) as StreamType
            console.log('Periodic check found stream:', parsedStream)
            setLocalSelectedStream(parsedStream)
            clearInterval(interval)
          }
        } catch (error) {
          console.error('Error in periodic localStorage check:', error)
        }
      }, 100) // Check every 100ms

      // Clear interval after 3 seconds to avoid infinite checking
      setTimeout(() => clearInterval(interval), 3000)
      
      return () => clearInterval(interval)
    }
  }, [localSelectedStream, selectedStream])

  // Use localSelectedStream as the effective stream value with additional localStorage fallback
  const effectiveStream = (() => {
    // Primary: use localSelectedStream if available
    if (localSelectedStream) return localSelectedStream
    
    // Secondary: use selectedStream prop if available  
    if (selectedStream) return selectedStream
    
    // Tertiary: try localStorage one more time as final fallback
    if (typeof window !== 'undefined') {
      try {
        const storedStream = localStorage.getItem('selectedStream')
        if (storedStream && storedStream !== 'null' && storedStream !== '""') {
          const parsedStream = JSON.parse(storedStream) as StreamType
          console.log('Final fallback - using localStorage stream:', parsedStream)
          // Set it to local state for next render
          setLocalSelectedStream(parsedStream)
          return parsedStream
        }
      } catch (error) {
        console.error('Error in final localStorage fallback:', error)
      }
    }
    
    return null
  })()

  // Filter files that have converted content
  const filesWithContent = uploadedFiles.filter(file => file.convertedContent)

  // Debug: Log all localStorage values and component state
  useEffect(() => {
    console.log('=== GenerationStep Debug Info ===')
    console.log('selectedStream prop:', selectedStream)
    console.log('localSelectedStream state:', localSelectedStream)
    console.log('effectiveStream:', effectiveStream)
    
    if (typeof window !== 'undefined') {
      console.log('All localStorage values:')
      console.log('- selectedStream:', localStorage.getItem('selectedStream'))
      console.log('- currentStep:', localStorage.getItem('currentStep'))
      console.log('- uploadedFiles:', localStorage.getItem('uploadedFiles'))
    }
    console.log('=== End Debug Info ===')
  }, [selectedStream, localSelectedStream, effectiveStream])

  // Debug: Log selectedStream to help with troubleshooting
  console.log('GenerationStep - effectiveStream:', effectiveStream)
  console.log('GenerationStep - selectedStream prop:', selectedStream)
  console.log('GenerationStep - localSelectedStream:', localSelectedStream)

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

  const handleGenerateTestCases = async () => {
    if (filesWithContent.length === 0) {
      return
    }

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    try {
      // For validation stream, process normally
      if (effectiveStream === "validation") {
        await processValidationFiles(controller)
      } else if (effectiveStream === "business") {
        await processBusinessFiles(controller)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation was cancelled')
      } else {
        console.error('Generation failed:', error)
      }
    } finally {
      setAbortController(null)
    }
  }

  const handleCancelGeneration = () => {
    // Show confirmation before cancelling
    const confirmed = window.confirm(
      `Are you sure you want to cancel the ${effectiveStream === "business" ? "business" : "validation"} test case generation?`
    )
    
    if (!confirmed) return
    
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      
      // Reset generation state
      setGenerationResults(prev => prev.map(result => 
        result.status === "generating" || result.status === "pending"
          ? { ...result, status: "error", error: "Cancelled by user" }
          : result
      ))
      setCurrentGeneratingIndex(-1)
      
      // Call parent cancel handler if provided
      onCancelGeneration?.()
      
      console.log(`${effectiveStream === "business" ? "Business" : "Validation"} test case generation cancelled by user`)
    }
  }

  const handleModifyFile = (fileId: string) => {
    onModifyFile?.(fileId)
  }

  const handleRemoveFile = (fileId: string) => {
    onRemoveFile?.(fileId)
  }

  const handleQuickCancelGeneration = () => {
    // Quick cancel without confirmation for the small button
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      
      // Reset generation state
      setGenerationResults(prev => prev.map(result => 
        result.status === "generating" || result.status === "pending"
          ? { ...result, status: "error", error: "Cancelled by user" }
          : result
      ))
      setCurrentGeneratingIndex(-1)
      
      // Call parent cancel handler if provided
      onCancelGeneration?.()
      
      console.log(`${effectiveStream === "business" ? "Business" : "Validation"} test case generation cancelled by user`)
    }
  }

  const handlePickFromHistory = () => {
    onPickFromHistory?.()
  }

  const processValidationFiles = async (controller?: AbortController) => {
    // Initialize generation results
    const initialResults: GenerationResult[] = filesWithContent.map(file => ({
      fileId: file.id,
      fileName: file.name,
      status: "pending"
    }))
    setGenerationResults(initialResults)
    setCurrentGeneratingIndex(0)

    // Process each file sequentially
    for (let i = 0; i < filesWithContent.length; i++) {
      // Check if cancelled
      if (controller?.signal.aborted) {
        throw new Error('Generation cancelled')
      }

      const file = filesWithContent[i]
      setCurrentGeneratingIndex(i)
      
      // Update status to generating
      setGenerationResults(prev => prev.map(result => 
        result.fileId === file.id 
          ? { ...result, status: "generating" }
          : result
      ))

      try {
        const response = await fetch("http://localhost:5678/webhook/generate-test-validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: file.convertedContent,
            fileName: file.name,
            fileType: file.type,
            stream: effectiveStream,
            fileId: file.id,
          }),
          signal: controller?.signal // Add abort signal to fetch
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        await handleValidationResponse(response, file)

      } catch (error) {
        // Check if it's an abort error
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Validation test case generation cancelled by user')
        }
        
        console.error("Generation failed for file:", file.name, error)
        
        setGenerationResults(prev => prev.map(result => 
          result.fileId === file.id 
            ? { 
                ...result, 
                status: "error", 
                error: error instanceof Error ? error.message : "Unknown error" 
              }
            : result
        ))
      }
    }

    setCurrentGeneratingIndex(-1) // Generation complete
  }

  const processBusinessFiles = async (controller?: AbortController) => {
    // For business flow, we need to combine all files into one request
    const businessFile = filesWithContent.find(f => f.type === "business")
    const detailApiFile = filesWithContent.find(f => f.type === "detail-api")
    const apiIntegrationFiles = filesWithContent.filter(f => f.type === "api-integration")

    if (!businessFile || !detailApiFile) {
      alert("Business flow requires both Business Document and Detail API files.")
      return
    }

    // Check if cancelled
    if (controller?.signal.aborted) {
      throw new Error('Generation cancelled')
    }

    // Create a single generation result for the combined request
    const combinedResult: GenerationResult = {
      fileId: "business-combined",
      fileName: "Business Test Cases",
      status: "pending"
    }
    setGenerationResults([combinedResult])
    setCurrentGeneratingIndex(0)

    // Update status to generating
    setGenerationResults([{ ...combinedResult, status: "generating" }])

    try {
      // Format the content according to the specified structure
      const apiIntegrationContent = apiIntegrationFiles
        .map(file => file.convertedContent)
        .join('\n\n')

      const requestBody = {
        business: `${businessFile.convertedContent}`,
        detailApi: `${detailApiFile.convertedContent}`,
        apiIntegration: `${apiIntegrationContent}`
      }

      const response = await fetch("http://localhost:5678/webhook/gen-test-case-bussiness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller?.signal // Add abort signal to fetch
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await handleBusinessResponse(response)

    } catch (error) {
      // Check if it's an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Business test case generation cancelled by user')
      }
      
      console.error("Business test case generation failed:", error)
      
      setGenerationResults([{ 
        ...combinedResult, 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      }])
    }

    setCurrentGeneratingIndex(-1) // Generation complete
  }

  const handleValidationResponse = async (response: Response, file: UploadedFile) => {
    // Handle different response formats
    const contentType = response.headers.get("content-type")
    
    if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
      // Handle as binary CSV data
      const arrayBuffer = await response.arrayBuffer()
      const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
      
      setGenerationResults(prev => prev.map(result => 
        result.fileId === file.id 
          ? { ...result, status: "completed", csvData }
          : result
      ))
    } else {
      // Handle JSON response with different formats
      const result = await response.json()
      let csvData = ""
      
      // Check if response has direct CSV field
      if (result.csv) {
        csvData = result.csv
      } else if (Array.isArray(result) && result.length > 0 && result[0].md) {
        const markdownData = result[0].md
        const fileName = result[0]["file name"] || file.name
        csvData = convertMarkdownToCSV(markdownData, fileName)
      } else if (result.csvData) {
        csvData = result.csvData
      } else if (result.data) {
        csvData = result.data
      } else if (result.file) {
        if (typeof result.file === 'string') {
          try {
            csvData = atob(result.file)
          } catch {
            csvData = result.file
          }
        } else {
          csvData = "Test case generation completed"
        }
      } else {
        csvData = "Test case generation completed"
      }

      setGenerationResults(prev => prev.map(result => 
        result.fileId === file.id 
          ? { ...result, status: "completed", csvData }
          : result
      ))
    }
  }

  const handleBusinessResponse = async (response: Response) => {
    // Handle different response formats
    const contentType = response.headers.get("content-type")
    
    if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
      // Handle as binary CSV data
      const arrayBuffer = await response.arrayBuffer()
      const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
      
      setGenerationResults([{ 
        fileId: "business-combined", 
        fileName: "Business Test Cases", 
        status: "completed", 
        csvData 
      }])
    } else {
      // Handle JSON response with different formats
      const result = await response.json()
      let csvData = ""
      
      // Check if response has direct CSV field
      if (result.csv) {
        csvData = result.csv
      } else if (Array.isArray(result) && result.length > 0 && result[0].md) {
        const markdownData = result[0].md
        const fileName = result[0]["file name"] || "Business Test Cases"
        csvData = convertMarkdownToCSV(markdownData, fileName)
      } else if (result.csvData) {
        csvData = result.csvData
      } else if (result.data) {
        csvData = result.data
      } else if (result.file) {
        if (typeof result.file === 'string') {
          try {
            csvData = atob(result.file)
          } catch {
            csvData = result.file
          }
        } else {
          csvData = "Business test case generation completed"
        }
      } else if (result.md) {
        // Direct markdown format - this is the new case we're adding to match validation response
        csvData = convertMarkdownToCSV(result.md, "Business Test Cases")
      } else if (typeof result === 'string' && result.includes('|')) {
        // If the response is a markdown table string directly
        csvData = convertMarkdownToCSV(result, "Business Test Cases")
      } else {
        csvData = "Business test case generation completed"
      }

      setGenerationResults([{ 
        fileId: "business-combined", 
        fileName: "Business Test Cases", 
        status: "completed", 
        csvData 
      }])
    }
  }

  const handleDownloadCSV = (result: GenerationResult) => {
    if (!result.csvData) return

    const blob = new Blob([result.csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.fileName.replace('.md', '')}_test_cases.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadAllCSV = () => {
    const completedResults = generationResults.filter(result => result.status === "completed" && result.csvData)
    
    if (completedResults.length === 0) return

    // Create a zip-like structure or concatenate all CSV files
    let combinedCSV = ""
    completedResults.forEach((result, index) => {
      if (index > 0) combinedCSV += "\n\n"
      combinedCSV += `=== ${result.fileName} ===\n`
      combinedCSV += result.csvData
    })

    const blob = new Blob([combinedCSV], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all_test_cases_${effectiveStream}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: GenerationResult["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />
      case "generating": return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error": return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: GenerationResult["status"]) => {
    switch (status) {
      case "pending": return "Pending"
      case "generating": return "Generating..."
      case "completed": return "Completed"
      case "error": return "Error"
    }
  }

  const progressPercentage = generationResults.length > 0 
    ? (generationResults.filter(r => r.status === "completed" || r.status === "error").length / generationResults.length) * 100
    : 0

  const completedCount = generationResults.filter(r => r.status === "completed").length

  return (
    <div className="space-y-6">
      {/* Stream Selection Display */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Selected Test Case Type</h3>
                <p className="text-sm text-blue-700">
                  {effectiveStream ? (
                    effectiveStream === "business" ? "Business Validation Test Cases" : "Technical Validation Test Cases"
                  ) : (
                    <span className="text-red-600">⚠️ No stream selected - please go back and select a test case type</span>
                  )}
                </p>
              </div>
            </div>
            {effectiveStream && (
              <Badge variant="default" className="bg-blue-600 text-white">
                {effectiveStream === "business" ? "Business" : "Validation"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Generate Test Cases</span>
            {effectiveStream && (
              <Badge variant="outline" className="ml-2">
                {effectiveStream === "business" ? "Business Validation" : "Technical Validation"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Generate comprehensive test cases from your converted markdown files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{filesWithContent.length}</div>
              <div className="text-sm text-blue-800">Files Ready</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {generationResults.filter(r => r.status === "error").length}
              </div>
              <div className="text-sm text-orange-800">Errors</div>
            </div>
          </div>

          {/* Progress Bar */}
          {generationResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generation Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          )}

          {/* Generation Controls */}
          <div className="space-y-3">
            {/* File Management Controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">File Management</h3>
              <div className="flex space-x-2">
                {onPickFromHistory && (
                  <Button
                    onClick={handlePickFromHistory}
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Pick from History
                  </Button>
                )}
              </div>
            </div>

            {/* Main Generation Controls */}
            <div className="flex space-x-3">
              <Button
                onClick={handleGenerateTestCases}
                disabled={!effectiveStream || filesWithContent.length === 0 || isGenerating || 
                  (effectiveStream === "business" && (!filesWithContent.find(f => f.type === "business") || !filesWithContent.find(f => f.type === "detail-api")))}
                className="flex-1"
              >
                {!effectiveStream ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    No Test Case Type Selected
                  </>
                ) : isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating {effectiveStream === "business" ? "Business" : "Validation"} Test Cases...
                  </>
                ) : effectiveStream === "business" ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Business Test Cases ({filesWithContent.length} files)
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Validation Test Cases ({filesWithContent.length} files)
                  </>
                )}
              </Button>
              
              {/* Cancel Button - only show when generating */}
              {isGenerating && (
                <Button
                  onClick={handleCancelGeneration}
                  variant="destructive"
                  size="default"
                  className="min-w-[120px]"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              
              {/* Download All Button */}
              {completedCount > 0 && !isGenerating && (
                <Button
                  variant="outline"
                  onClick={handleDownloadAllCSV}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All CSV
                </Button>
              )}
            </div>
            
            {/* Generation Status Information */}
            {isGenerating && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Generating {selectedStream === "business" ? "Business" : "Validation"} Test Cases
                    </span>
                  </div>
                  <Button
                    onClick={handleQuickCancelGeneration}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                </div>
                <div className="mt-2 text-xs text-blue-700">
                  {selectedStream === "business" 
                    ? "Processing combined business flow..." 
                    : `Processing file ${currentGeneratingIndex + 1} of ${filesWithContent.length}...`
                  }
                </div>
              </div>
            )}
          </div>

          {/* Business Flow Validation Warning */}
          {effectiveStream === "business" && (!filesWithContent.find(f => f.type === "business") || !filesWithContent.find(f => f.type === "detail-api")) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>⚠️ Missing Required Files:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  {!filesWithContent.find(f => f.type === "business") && <li>Business Document is required</li>}
                  {!filesWithContent.find(f => f.type === "detail-api") && <li>Detail API Document is required</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Files List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {effectiveStream === "business" ? "Files for Business Test Generation" : "Files for Validation Test Generation"}
            </h3>
            
            {selectedStream === "business" && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📋 Business Flow Requirements</h4>
                <div className="grid gap-2 text-sm">
                  <div><span className="font-medium text-purple-800">📋 Business Document:</span> Required (1 file)</div>
                  <div><span className="font-medium text-blue-800">🔧 Detail API:</span> Required (1 file)</div>
                  <div><span className="font-medium text-green-800">🔗 API Integration:</span> Optional (multiple files allowed)</div>
                </div>
              </div>
            )}
            
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-3">
                {selectedStream === "business" ? (
                  // Business flow: show combined result
                  generationResults.length > 0 ? (
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Combined Business Test Cases</span>
                          <Badge variant="secondary">business-flow</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(generationResults[0].status)}
                          <span className="text-sm">{getStatusText(generationResults[0].status)}</span>
                          {generationResults[0].status === "completed" && generationResults[0].csvData && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadCSV(generationResults[0])}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {generationResults[0].error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          Error: {generationResults[0].error}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div><strong>Business Files:</strong> {filesWithContent.filter(f => f.type === "business").length}</div>
                        <div><strong>Detail API Files:</strong> {filesWithContent.filter(f => f.type === "detail-api").length}</div>
                        <div><strong>API Integration Files:</strong> {filesWithContent.filter(f => f.type === "api-integration").length}</div>
                      </div>
                    </div>
                  ) : (
                    // Show available files for business flow
                    <>
                      {["business", "detail-api", "api-integration"].map(fileType => {
                        const typeFiles = filesWithContent.filter(f => f.type === fileType)
                        const typeLabel = fileType === "business" ? "📋 Business" : 
                                        fileType === "detail-api" ? "🔧 Detail API" : "🔗 API Integration"
                        
                        return (
                          <div key={fileType} className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">{typeLabel}</h4>
                            {typeFiles.length > 0 ? (
                              typeFiles.map(file => (
                                <div key={file.id} className="p-3 border rounded-lg bg-card ml-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium text-sm">{file.name}</span>
                                      <Badge variant="secondary">{file.type}</Badge>
                                    </div>
                                    {/* File Actions for Business Flow */}
                                    {!isGenerating && (
                                      <div className="flex items-center space-x-1">
                                        {onModifyFile && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleModifyFile(file.id)}
                                            className="h-6 w-6 p-0"
                                            title="Modify file"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        )}
                                        {onRemoveFile && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            title="Remove file"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Content: {file.convertedContent?.substring(0, 100)}...
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 border border-dashed rounded-lg bg-muted/30 ml-4">
                                <span className="text-sm text-muted-foreground">
                                  {fileType === "api-integration" ? "No files (optional)" : "No files (required)"}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )
                ) : (
                  // Validation flow: show individual files
                  filesWithContent.map((file, index) => {
                    const result = generationResults.find(r => r.fileId === file.id)
                    const isCurrentlyGenerating = currentGeneratingIndex === index && isGenerating
                    
                    return (
                      <div
                        key={file.id}
                        className={`p-4 border rounded-lg ${
                          isCurrentlyGenerating ? "border-primary bg-primary/5" : "bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{file.name}</span>
                            <Badge variant="secondary">{file.type}</Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* File Actions */}
                            {!isGenerating && (
                              <>
                                {onModifyFile && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleModifyFile(file.id)}
                                    className="h-6 w-6 p-0"
                                    title="Modify file"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {onRemoveFile && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFile(file.id)}
                                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    title="Remove file"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* Generation Status */}
                            {result && (
                              <>
                                {getStatusIcon(result.status)}
                                <span className="text-sm">{getStatusText(result.status)}</span>
                                {result.status === "completed" && result.csvData && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadCSV(result)}
                                    className="h-6 w-6 p-0"
                                    title="Download CSV"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        
                        {result?.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            Error: {result.error}
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Content: {file.convertedContent?.substring(0, 100)}...
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack} disabled={isGenerating}>
              Back to Review
            </Button>
            
            {completedCount === filesWithContent.length && filesWithContent.length > 0 && (
              <div className="text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                All test cases generated successfully!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
