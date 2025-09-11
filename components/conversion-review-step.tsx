"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Loader2, CheckCircle, AlertCircle, Eye, Trash2, RefreshCw, Maximize2, Minimize2, X, Upload } from "lucide-react"
import { marked } from "marked"
import type { UploadedFile, StreamType } from "@/app/page"
import { useLocalStorage } from "@/lib/hooks"
import { ConversionComparison } from "./conversion-comparison"

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Convert markdown to HTML using marked library
function convertMarkdownToHTML(markdown: string): string {
  try {
    return marked(markdown) as string
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return `<p class="text-destructive">Error parsing markdown content</p>`
  }
}

interface ConversionReviewStepProps {
  uploadedFiles: UploadedFile[]
  isConverting: boolean
  setIsConverting: (value: boolean) => void
  onConvert: () => void
  onBack: () => void
  selectedStream: StreamType | null
  onDeleteFile: (fileId: string) => void
  onRegenerate: (fileId: string) => void
  onUpdateFiles: (files: UploadedFile[]) => void
  onNavigateToStep?: (step: number) => void // Add navigation prop
}

interface ConversionStatus {
  fileId: string
  status: "pending" | "converting" | "completed" | "error"
  error?: string
  markdownResult?: string
}

export function ConversionReviewStep({
  uploadedFiles,
  isConverting,
  setIsConverting,
  onConvert,
  onBack,
  selectedStream,
  onDeleteFile,
  onRegenerate,
  onUpdateFiles,
  onNavigateToStep,
}: ConversionReviewStepProps) {
  const [selectedFile, setSelectedFile] = useState(uploadedFiles[0]?.id || "")
  const [conversionStatuses, setConversionStatuses] = useState<ConversionStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [viewingResult, setViewingResult] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Use a ref to track if we're mounted and to prevent duplicate conversions
  const isMounted = useRef(false)
  const isInitialized = useRef(false)
  
  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCancelledRef = useRef(false)
  
  // Get conversion statuses from storage or initialize new ones
  const [storedData, setStoredData] = useLocalStorage<{
    statuses: ConversionStatus[]
    currentIndex: number
  }>(
    `conversion-data-${selectedStream}`,
    {
      statuses: [],
      currentIndex: 0
    }
  )

  // Initialize statuses when component mounts or files change
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true
      isMounted.current = true
      
      const initialStatuses = uploadedFiles.map(file => {
        const existing = storedData.statuses.find(s => s.fileId === file.id)
        return existing || {
          fileId: file.id,
          status: "pending" as const
        }
      })
      
      if (initialStatuses.length > 0) {
        setConversionStatuses(initialStatuses)
        setCurrentFileIndex(storedData.currentIndex)
      }
      return
    }

    // When files change, ensure we preserve existing conversion data
    const existingIds = new Set(conversionStatuses.map(s => s.fileId))
    const needsUpdate = uploadedFiles.some(file => !existingIds.has(file.id)) || 
                       conversionStatuses.some(s => !uploadedFiles.find(f => f.id === s.fileId))
    
    if (needsUpdate) {
      setConversionStatuses(prev => {
        const newStatuses = uploadedFiles.map(file => {
          // First check existing state, then localStorage
          const existing = prev.find(s => s.fileId === file.id) || 
                          storedData.statuses.find(s => s.fileId === file.id)
          return existing || {
            fileId: file.id,
            status: "pending" as const
          }
        })
        return newStatuses
      })
    }
  }, [uploadedFiles.length, storedData])

  // Re-sync when component becomes visible (e.g., when navigating back to step 2)
  useEffect(() => {
    if (selectedStream && uploadedFiles.length > 0 && storedData.statuses.length > 0) {
      const timer = setTimeout(() => {
        // Force re-sync with stored data
        const syncedStatuses = uploadedFiles.map(file => {
          const stored = storedData.statuses.find(s => s.fileId === file.id)
          return stored || {
            fileId: file.id,
            status: "pending" as const
          }
        })
        
        // Check if current state differs from stored data
        const needsSync = syncedStatuses.some((synced, index) => {
          const current = conversionStatuses[index]
          return !current || 
                 current.status !== synced.status || 
                 current.markdownResult !== synced.markdownResult
        })
        
        if (needsSync) {
          setConversionStatuses(syncedStatuses)
        }
      }, 50)
      
      return () => clearTimeout(timer)
    }
  }, [selectedStream, uploadedFiles.length, storedData.statuses.length])

  // Update selected file if current selection is deleted
  useEffect(() => {
    if (selectedFile && !uploadedFiles.find(file => file.id === selectedFile)) {
      setSelectedFile(uploadedFiles[0]?.id || "")
    }
  }, [uploadedFiles, selectedFile])

  // Sync with localStorage when statuses or index change
  useEffect(() => {
    if (!isMounted.current) return
    
    const timeoutId = setTimeout(() => {
      setStoredData({
        statuses: conversionStatuses,
        currentIndex: currentFileIndex
      })
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [conversionStatuses, currentFileIndex, setStoredData])

  // Cancel conversion function
  const handleCancelConversion = useCallback(() => {
    isCancelledRef.current = true
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setIsConverting(false)
    
    // Reset current file status to pending
    const currentFile = uploadedFiles[currentFileIndex]
    if (currentFile) {
      setConversionStatuses(prev => 
        prev.map(status => 
          status.fileId === currentFile.id 
            ? { ...status, status: "pending" as const, error: undefined } 
            : status
        )
      )
    }
  }, [currentFileIndex, uploadedFiles, setIsConverting])

  // Convert all files function
  const handleConvertAllFiles = useCallback(async () => {
    if (isConverting || uploadedFiles.length === 0) return

    setIsConverting(true)
    isCancelledRef.current = false
    
    // Reset all files to pending status
    setConversionStatuses(prev => 
      prev.map(status => ({ 
        ...status, 
        status: "pending" as const, 
        error: undefined 
      }))
    )

    // Convert files one by one
    for (let i = 0; i < uploadedFiles.length; i++) {
      // Check if cancelled
      if (isCancelledRef.current) break
      
      const file = uploadedFiles[i]
      
      setCurrentFileIndex(i)
      
      // Update status to converting
      setConversionStatuses(prev => 
        prev.map(status => 
          status.fileId === file.id 
            ? { ...status, status: "converting" } 
            : status
        )
      )

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController()

        const response = await fetch("http://localhost:5678/webhook/html-to-md", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: file.content,
            fileName: file.name,
            fileType: file.type,
            stream: selectedStream,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        let markdownContent = "Conversion completed"
        
        if (result.status === "success" && result.files && result.files.length > 0) {
          const base64Data = result.files[0].data
          if (base64Data) {
            try {
              const binaryString = atob(base64Data)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              markdownContent = new TextDecoder('utf-8').decode(bytes)
            } catch (decodeError) {
              console.error("Base64 decode error:", decodeError)
              markdownContent = base64Data
            }
          } else {
            markdownContent = "No content received"
          }
        } else {
          // Generate mock markdown content for demo purposes
          markdownContent = `# Converted ${file.name}\n\nThis is a mock conversion result for demonstration purposes.\n\nOriginal file: ${file.name}\nFile type: ${file.type}\nStream: ${selectedStream}\n\n## Content\n\nThis would contain the actual converted markdown content from your HTML file.`
        }

        // Check if cancelled before updating status
        if (isCancelledRef.current) break

        setConversionStatuses((prev) => {
          const updatedStatuses = prev.map((status) =>
            status.fileId === file.id
              ? {
                  ...status,
                  status: "completed" as const,
                  markdownResult: markdownContent,
                }
              : status
          )
          localStorage.setItem(`conversion-statuses-${selectedStream}`, JSON.stringify(updatedStatuses))
          return updatedStatuses
        })

        // Small delay between conversions
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error("Conversion failed for:", file.name, error)

        // Check if error is due to abort
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("Conversion was cancelled")
          break
        }

        setConversionStatuses((prev) =>
          prev.map((status) =>
            status.fileId === file.id
              ? { ...status, status: "error", error: error instanceof Error ? error.message : "Unknown error" }
              : status,
          ),
        )
      }
    }

    setIsConverting(false)
    abortControllerRef.current = null
    isCancelledRef.current = false
    
    // After conversion is complete, update the main uploadedFiles state with converted content
    setTimeout(() => {
      const updatedFiles = uploadedFiles.map(file => {
        const conversionStatus = conversionStatuses.find(s => s.fileId === file.id)
        if (conversionStatus && conversionStatus.status === "completed" && conversionStatus.markdownResult) {
          return {
            ...file,
            convertedContent: conversionStatus.markdownResult
          }
        }
        return file
      })
      
      // Update the main state in parent component
      onUpdateFiles(updatedFiles)
      console.log('Updated uploadedFiles with converted content:', updatedFiles.filter(f => f.convertedContent).length, 'files')
    }, 100) // Small delay to ensure state updates are complete
  }, [uploadedFiles, isConverting, selectedStream, setIsConverting, conversionStatuses, onUpdateFiles])

  // Upload conversion results directly to history
  const handleUploadToHistory = () => {
    const completedFiles = uploadedFiles.filter(file => {
      const status = conversionStatuses.find(s => s.fileId === file.id)
      return status?.status === "completed" && status.markdownResult
    })

    if (completedFiles.length === 0) {
      alert("No converted files available to upload. Please convert files first.")
      return
    }

    // Create history items for each file with .md extension
    const historyItems = completedFiles.map(file => {
      const status = conversionStatuses.find(s => s.fileId === file.id)
      // Change file extension to .md
      const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      const mdFileName = `${originalNameWithoutExt}.md`
      
      return {
        id: `${file.id}-${Date.now()}`,
        fileName: mdFileName, // Save with .md extension
        content: status?.markdownResult || "",
        timestamp: Date.now(),
        type: file.type
      }
    })

    // Save each file separately to localStorage
    const existingHistory = JSON.parse(localStorage.getItem('conversion-history') || '[]')
    const updatedHistory = [...historyItems, ...existingHistory]
    localStorage.setItem('conversion-history', JSON.stringify(updatedHistory))

    // Trigger storage event for other components to update
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'conversion-history',
      newValue: JSON.stringify(updatedHistory)
    }))

    // Show success message and ask user what to do next
    const result = confirm(
      `Successfully uploaded ${completedFiles.length} files to history with .md extension!\n\n` +
      `Click OK to go directly to Step 3 (Generation), or Cancel to stay here.`
    )

    if (result && onNavigateToStep) {
      // Go directly to step 3 (generation step)
      onNavigateToStep(3)
    }
  }

  // Cleanup effect to cancel requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  const fileTypeLabels = {
    "business": "📋 Business Requirements",
    "detail-api": "🔧 Technical Specifications", 
    "api-integration": "🔗 Integration Guides",
    "validation": "✅ Validation Document",
    "error": "❌ Error"
  }

  const selectedFileData = uploadedFiles.find((file) => file.id === selectedFile)
  
  // Get the actual converted content from conversion statuses
  const getConvertedContent = (fileId: string) => {
    const status = conversionStatuses.find(s => s.fileId === fileId)
    return status?.markdownResult || "No converted content available from conversion step"
  }

  // Check if any files have been successfully converted
  const hasAnyConvertedFiles = () => {
    return uploadedFiles.some(file => {
      const status = conversionStatuses.find(s => s.fileId === file.id)
      return status?.status === "completed" && status.markdownResult
    })
  }

  const getStatusIcon = (status: ConversionStatus["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="h-5 w-5 text-muted-foreground" />
      case "converting":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusColor = (status: ConversionStatus["status"]) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800"
      case "converting":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
    }
  }

  const currentFile = uploadedFiles[currentFileIndex]
  const currentStatus = conversionStatuses.find((s) => s.fileId === currentFile?.id)
  const allCompleted = conversionStatuses.every((s) => s.status === "completed")

  if (isFullscreen && selectedFileData) {
    return (
      <div className=" h-full w-full fixed inset-0 z-50 bg-background ">
        <div className="flex flex-col h-full  ">
          {/* Fullscreen Header */}
          <div className="  flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold" title={selectedFileData.name}>
                {selectedFileData.name}
              </h2>
              <Badge variant="outline">{fileTypeLabels[selectedFileData.type]}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerate(selectedFileData.id)}
                disabled={isConverting}
              >
                {isConverting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>
          </div>

          {/* Fullscreen Content */}
          <div className="flex-1 overflow-hidden overflow-y-auto overflow-x-auto scroll-container">
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-4 grid w-fit grid-cols-2 h-12">
                <TabsTrigger value="preview" className="text-base px-6">Preview Markdown</TabsTrigger>
                <TabsTrigger value="converted" className="text-base px-6">Raw Markdown</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 mx-4 mb-4 mt-2">
                <div className="h-full w-full border rounded-lg bg-background shadow-sm overflow-y-auto overflow-x-auto scroll-container">
                  <div className="p-8 min-w-0">
                    <div 
                      className="text-base leading-relaxed markdown-content"
                      style={{ minWidth: '1000px', width: 'max-content' }}
                      dangerouslySetInnerHTML={{
                        __html: convertMarkdownToHTML(getConvertedContent(selectedFileData.id))
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="converted" className="flex-1 mx-4 mb-4 mt-2">
                <div className="h-full w-full border rounded-lg bg-muted/10 overflow-y-auto overflow-x-auto scroll-container">
                  <div className="p-8">
                    <pre className="text-sm whitespace-pre font-mono leading-relaxed text-muted-foreground" style={{ minWidth: '1000px' }}>
                      {getConvertedContent(selectedFileData.id)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    )
  }

  if (viewingResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Converted Markdown Result</CardTitle>
          <CardDescription>Review the converted markdown content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{viewingResult}</pre>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setViewingResult(null)}>
              Back to Conversion & Review
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Conversion Section */}
      <Card>
        <CardHeader>
          <CardTitle>Convert to Markdown</CardTitle>
          <CardDescription>
            Ready to convert your uploaded HTML files to Markdown format for {selectedStream} test case generation.
            Click "Convert All Files" to start the conversion process.
            {isConverting && ` Converting file ${currentFileIndex + 1} of ${uploadedFiles.length}...`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedStream && (
            <div className="flex items-center space-x-2 p-3 bg-accent/10 rounded-lg">
              <Badge
                variant="secondary"
                className={selectedStream === "business" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
              >
                {selectedStream.charAt(0).toUpperCase() + selectedStream.slice(1)} Stream
              </Badge>
              <span className="text-sm text-muted-foreground">
                {isConverting ? "Converting files..." : "Ready for manual conversion"}
              </span>
            </div>
          )}

          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Files Uploaded</h3>
              <p className="text-sm text-muted-foreground">Go back to upload some files before proceeding with conversion.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {uploadedFiles.map((file, index) => {
                const status = conversionStatuses.find((s) => s.fileId === file.id)
                const isCurrent = index === currentFileIndex
                return (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${isCurrent ? "border-blue-300 bg-blue-50" : ""}`}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status?.status || "pending")}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" title={file.name}>{file.name}</p>
                        <Badge variant="outline">{fileTypeLabels[file.type]}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className={getStatusColor(status?.status || "pending")}>
                        {status?.status || "pending"}
                      </Badge>
                      {status?.status === "completed" && (
                        <Button variant="outline" size="sm" onClick={() => setViewingResult(status.markdownResult || "")}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDeleteFile(file.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        disabled={isConverting && status?.status === "converting"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Section - Only show when files are converted */}
      {hasAnyConvertedFiles() && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Review Converted Files</CardTitle>
            <CardDescription className="text-base">
              Review the converted Markdown files for {selectedStream} test case generation. If any file doesn't look
              correct, you can regenerate it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* File List - Takes less space on large screens */}
              <div className="xl:col-span-1 space-y-3">
                <h3 className="font-medium">Converted Files</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {uploadedFiles.filter(file => {
                    const status = conversionStatuses.find(s => s.fileId === file.id)
                    return status?.status === "completed"
                  }).map((file) => {
                    const status = conversionStatuses.find(s => s.fileId === file.id)
                    return (
                      <div
                        key={file.id}
                        className={`p-3 border rounded-lg transition-colors ${
                          selectedFile === file.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0"
                            onClick={() => setSelectedFile(file.id)}
                          >
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {fileTypeLabels[file.type]}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRegenerate(file.id)
                              }}
                              disabled={isConverting}
                              className="hover:bg-blue/10 hover:text-blue h-6 w-6 p-0"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* File Preview - Takes most of the space */}
              <div className="xl:col-span-4">
                {selectedFileData && getConvertedContent(selectedFileData.id) !== "No converted content available from conversion step" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <h3 className="text-lg font-semibold truncate pr-4" title={selectedFileData.name}>{selectedFileData.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFullscreen(true)}
                          className="flex-shrink-0"
                        >
                          <Maximize2 className="mr-2 h-4 w-4" />
                          Fullscreen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRegenerate(selectedFileData.id)}
                          disabled={isConverting}
                          className="flex-shrink-0"
                        >
                          {isConverting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Regenerate
                        </Button>
                      </div>
                    </div>

                    <Tabs defaultValue="preview" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-12">
                        <TabsTrigger value="preview" className="text-base">Preview Markdown</TabsTrigger>
                        <TabsTrigger value="converted" className="text-base">Raw Markdown</TabsTrigger>
                      </TabsList>

                      <TabsContent value="preview" className="mt-6">
                        <div className="h-[600px] w-full border rounded-lg bg-background shadow-sm overflow-x-auto overflow-y-auto scroll-container">
                          <div className="p-6 min-w-0">
                            <div 
                              className="text-base leading-relaxed markdown-content"
                              style={{ minWidth: '800px', width: 'max-content' }}
                              dangerouslySetInnerHTML={{    
                                __html: convertMarkdownToHTML(getConvertedContent(selectedFileData.id))
                              }}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="converted" className="mt-6">
                        <div className="h-[600px] w-full border rounded-lg bg-muted/10 overflow-x-auto overflow-y-auto scroll-container">
                          <div className="p-6">
                            <pre className="text-sm whitespace-pre font-mono leading-relaxed text-muted-foreground min-w-max" style={{ minWidth: '800px' }}>
                              {getConvertedContent(selectedFileData.id)}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-8 mt-8">
              <div className="flex items-center space-x-3 mb-6 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Are the files correct and match your documents?</p>
                  <p className="text-sm text-green-700 mt-1">
                    Please review each converted file to ensure the content is accurate. If any file needs adjustment, use the
                    "Regenerate" button to convert it again.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onBack} disabled={isConverting} size="lg">
          Back
        </Button>
        <div className="space-x-3">
          {uploadedFiles.length === 0 ? (
            <Button disabled size="lg" className="min-w-48">
              No Files to Convert
            </Button>
          ) : allCompleted ? (
            <>
              {hasAnyConvertedFiles() && (
                <Button 
                  variant="outline"
                  onClick={handleUploadToHistory}
                  size="lg"
                  className="min-w-32"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to History
                </Button>
              )}
              <Button 
                onClick={onConvert} 
                disabled={!hasAnyConvertedFiles()}
                size="lg"
                className="min-w-48"
              >
                {!hasAnyConvertedFiles()
                  ? "Files Not Converted Yet"
                  : "Files Look Good - Generate Test Cases"}
              </Button>
            </>
          ) : (
            <>
              {isConverting && (
                <Button
                  variant="outline"
                  onClick={handleCancelConversion}
                  size="lg"
                  className="min-w-32"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleConvertAllFiles}
                disabled={isConverting}
                size="lg"
                className="min-w-48"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting Files...
                  </>
                ) : (
                  "Convert All Files"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
