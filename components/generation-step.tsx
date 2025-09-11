"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, CheckCircle, Download, X, FolderOpen, StopCircle, AlertCircle, RotateCcw } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"
import { useEffectiveStream } from "@/lib/stream-utils"
import { convertMarkdownToCSV } from "@/lib/csv-utils"
import { isDevMode, simulateAsyncOperation } from "@/lib/dev-mode"
import { GenerationStatusDisplay } from "./generation-status-display"
import { FileListDisplay } from "./file-list-display"
import { DownloadDialog } from "./download-dialog"

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
  onGenerateNew?: () => void
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
  onCancelGeneration,
  onGenerateNew
}: GenerationStepProps) {
  const [generationResults, setGenerationResults] = useState<GenerationResult[]>([])
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<GenerationResult | null>(null)
  
  const effectiveStream = useEffectiveStream(selectedStream)
  const filesWithContent = uploadedFiles.filter(file => file.convertedContent)

  const handleGenerateTestCases = async () => {
    if (filesWithContent.length === 0) return

    const controller = new AbortController()
    setAbortController(controller)

    try {
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
    const confirmed = window.confirm(
      `Are you sure you want to cancel the ${effectiveStream === "business" ? "business" : "validation"} test case generation?`
    )
    
    if (!confirmed) return
    
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      
      setGenerationResults(prev => prev.map(result => 
        result.status === "generating" || result.status === "pending"
          ? { ...result, status: "error", error: "Cancelled by user" }
          : result
      ))
      setCurrentGeneratingIndex(-1)
      onCancelGeneration?.()
    }
  }

  const handleQuickCancelGeneration = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      
      setGenerationResults(prev => prev.map(result => 
        result.status === "generating" || result.status === "pending"
          ? { ...result, status: "error", error: "Cancelled by user" }
          : result
      ))
      setCurrentGeneratingIndex(-1)
      onCancelGeneration?.()
    }
  }

  const processValidationFiles = async (controller?: AbortController) => {
    const initialResults: GenerationResult[] = filesWithContent.map(file => ({
      fileId: file.id,
      fileName: file.name,
      status: "pending"
    }))
    setGenerationResults(initialResults)
    setCurrentGeneratingIndex(0)

    for (let i = 0; i < filesWithContent.length; i++) {
      if (controller?.signal.aborted) {
        throw new Error('Generation cancelled')
      }

      const file = filesWithContent[i]
      setCurrentGeneratingIndex(i)
      
      setGenerationResults(prev => prev.map(result => 
        result.fileId === file.id 
          ? { ...result, status: "generating" }
          : result
      ))

      try {
        if (isDevMode()) {
          // Mock API response in dev mode
          console.log(`🚀 Dev Mode: Mocking validation test generation for ${file.name}`)
          await simulateAsyncOperation(1500) // Simulate API delay
          
          const mockCsvData = `Test Case ID,Description,Input,Expected Output,Priority
TC001,Valid input test for ${file.name},Sample input data,Success response,High
TC002,Invalid input test for ${file.name},Invalid data,Error response,Medium
TC003,Edge case test for ${file.name},Boundary values,Handled gracefully,Low
TC004,Performance test for ${file.name},Large dataset,Response within 2s,Medium
TC005,Security test for ${file.name},Malformed input,Secure error handling,High`
          
          setGenerationResults(prev => prev.map(result => 
            result.fileId === file.id 
              ? { ...result, status: "completed", csvData: mockCsvData }
              : result
          ))
        } else {
          // Real API call
          const response = await fetch("http://localhost:5678/webhook/generate-test-validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: file.convertedContent,
              fileName: file.name,
              fileType: file.type,
              stream: effectiveStream,
              fileId: file.id,
            }),
            signal: controller?.signal
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          await handleValidationResponse(response, file)
        }

      } catch (error) {
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

    setCurrentGeneratingIndex(-1)
  }

  const processBusinessFiles = async (controller?: AbortController) => {
    const businessFile = filesWithContent.find(f => f.type === "business")
    const detailApiFile = filesWithContent.find(f => f.type === "detail-api")
    const apiIntegrationFiles = filesWithContent.filter(f => f.type === "api-integration")

    if (!businessFile || !detailApiFile) {
      alert("Business flow requires both Business Document and Detail API files.")
      return
    }

    if (controller?.signal.aborted) {
      throw new Error('Generation cancelled')
    }

    const combinedResult: GenerationResult = {
      fileId: "business-combined",
      fileName: "Business Test Cases",
      status: "pending"
    }
    setGenerationResults([combinedResult])
    setCurrentGeneratingIndex(0)

    setGenerationResults([{ ...combinedResult, status: "generating" }])

    try {
      if (isDevMode()) {
        // Mock API response in dev mode
        console.log(`🚀 Dev Mode: Mocking business test generation`)
        await simulateAsyncOperation(2000) // Longer delay for business flow
        
        const mockBusinessCsvData = `Test Case ID,Business Scenario,Test Steps,Expected Result,Priority
BTC001,User registration flow,1. Fill registration form 2. Submit form 3. Verify email,User registered successfully,High
BTC002,Product purchase flow,1. Add item to cart 2. Proceed to checkout 3. Complete payment,Order placed successfully,High
BTC003,Invalid payment method,1. Select invalid payment 2. Attempt purchase,Payment error displayed,Medium
BTC004,Cart abandonment,1. Add items to cart 2. Leave without purchase,Cart items preserved for 24h,Low
BTC005,Customer support contact,1. Navigate to help 2. Submit contact form,Support ticket created,Medium`
        
        setGenerationResults([{ 
          fileId: "business-combined", 
          fileName: "Business Test Cases", 
          status: "completed", 
          csvData: mockBusinessCsvData 
        }])
      } else {
        // Real API call
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller?.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        await handleBusinessResponse(response)
      }

    } catch (error) {
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

    setCurrentGeneratingIndex(-1)
  }

  const handleValidationResponse = async (response: Response, file: UploadedFile) => {
    const contentType = response.headers.get("content-type")
    
    if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
      const arrayBuffer = await response.arrayBuffer()
      const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
      
      setGenerationResults(prev => prev.map(result => 
        result.fileId === file.id 
          ? { ...result, status: "completed", csvData }
          : result
      ))
    } else {
      const result = await response.json()
      let csvData = ""
      
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
    const contentType = response.headers.get("content-type")
    
    if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
      const arrayBuffer = await response.arrayBuffer()
      const csvData = new TextDecoder('utf-8').decode(arrayBuffer)
      
      setGenerationResults([{ 
        fileId: "business-combined", 
        fileName: "Business Test Cases", 
        status: "completed", 
        csvData 
      }])
    } else {
      const result = await response.json()
      let csvData = ""
      
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
        csvData = convertMarkdownToCSV(result.md, "Business Test Cases")
      } else if (typeof result === 'string' && result.includes('|')) {
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
    
    setPendingDownload(result)
    setDownloadDialogOpen(true)
  }

  const handleDownloadConfirm = (filename: string) => {
    if (!pendingDownload?.csvData) return

    const blob = new Blob([pendingDownload.csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    // Clear pending download
    setPendingDownload(null)
  }


  const progressPercentage = generationResults.length > 0 
    ? (generationResults.filter(r => r.status === "completed" || r.status === "error").length / generationResults.length) * 100
    : 0

  const completedCount = generationResults.filter(r => r.status === "completed").length

  // Helper function to calculate file size
  const getFileSize = (csvData: string): string => {
    const bytes = new Blob([csvData]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Generate default filename
  const getDefaultFilename = (result: GenerationResult): string => {
    const streamName = effectiveStream === "business" ? "business" : "validation"
    const timestamp = new Date().toISOString().split('T')[0]
    
    const baseName = result.fileName.replace('.md', '').replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${baseName}_${streamName}_testcases_${timestamp}.csv`
  }

  return (
    <div className="space-y-6">
      <GenerationStatusDisplay effectiveStream={effectiveStream} />

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

          {generationResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generation Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">File Management</h3>
              <div className="flex space-x-2">
                {onPickFromHistory && (
                  <Button
                    onClick={onPickFromHistory}
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
              
            </div>
            
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

          <FileListDisplay
            uploadedFiles={uploadedFiles}
            selectedStream={selectedStream}
            generationResults={generationResults}
            currentGeneratingIndex={currentGeneratingIndex}
            isGenerating={isGenerating}
            onModifyFile={onModifyFile}
            onRemoveFile={onRemoveFile}
            onDownloadCSV={handleDownloadCSV}
          />

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack} disabled={isGenerating}>
              Back to Review
            </Button>
            
            <div className="flex items-center space-x-4">
              {((effectiveStream === "validation" && completedCount === filesWithContent.length && filesWithContent.length > 0) ||
                (effectiveStream === "business" && completedCount === 1 && filesWithContent.length > 0)) && 
                !isGenerating && (
                <>
                  <div className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    All test cases generated successfully!
                  </div>
                  {onGenerateNew && (
                    <Button 
                      onClick={onGenerateNew}
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Generate New Test Case
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Dialog */}
      <DownloadDialog
        isOpen={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        onConfirm={handleDownloadConfirm}
        defaultFilename={pendingDownload ? getDefaultFilename(pendingDownload) : "test_cases.csv"}
        fileSize={pendingDownload?.csvData ? getFileSize(pendingDownload.csvData) : "Unknown"}
        streamType={effectiveStream}
      />
    </div>
  )
}