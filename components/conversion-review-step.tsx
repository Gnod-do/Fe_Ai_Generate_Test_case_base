"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Loader2, CheckCircle, AlertCircle, Eye, Trash2, RefreshCw, X, Upload } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"
import { useLocalStorage } from "@/lib/hooks"
import { FullscreenPreview } from "./fullscreen-preview"
import { FilePreviewTabs } from "./file-preview-tabs"
import { useConversionLogic } from "./conversion-utils"
import { isDevMode } from "@/lib/dev-mode"

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
  onNavigateToStep?: (step: number) => void
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
  const [viewingResult, setViewingResult] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const isMounted = useRef(false)
  const isInitialized = useRef(false)
  
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

  const {
    conversionStatuses,
    setConversionStatuses,
    currentFileIndex,
    handleCancelConversion,
    handleConvertAllFiles,
    abortControllerRef
  } = useConversionLogic(uploadedFiles, selectedStream, setIsConverting, onUpdateFiles)

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
      }
      return
    }

    const existingIds = new Set(conversionStatuses.map(s => s.fileId))
    const needsUpdate = uploadedFiles.some(file => !existingIds.has(file.id)) || 
                       conversionStatuses.some(s => !uploadedFiles.find(f => f.id === s.fileId))
    
    if (needsUpdate) {
      setConversionStatuses(prev => {
        const newStatuses = uploadedFiles.map(file => {
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

  useEffect(() => {
    if (selectedStream && uploadedFiles.length > 0 && storedData.statuses.length > 0) {
      const timer = setTimeout(() => {
        const syncedStatuses = uploadedFiles.map(file => {
          const stored = storedData.statuses.find(s => s.fileId === file.id)
          return stored || {
            fileId: file.id,
            status: "pending" as const
          }
        })
        
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

  useEffect(() => {
    if (selectedFile && !uploadedFiles.find(file => file.id === selectedFile)) {
      setSelectedFile(uploadedFiles[0]?.id || "")
    }
  }, [uploadedFiles, selectedFile])

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

  const handleUploadToHistory = () => {
    const completedFiles = uploadedFiles.filter(file => {
      const status = conversionStatuses.find(s => s.fileId === file.id)
      return status?.status === "completed" && status.markdownResult
    })

    if (completedFiles.length === 0) {
      alert("No converted files available to upload. Please convert files first.")
      return
    }

    const historyItems = completedFiles.map(file => {
      const status = conversionStatuses.find(s => s.fileId === file.id)
      const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      const mdFileName = `${originalNameWithoutExt}.md`
      
      return {
        id: `${file.id}-${Date.now()}`,
        fileName: mdFileName,
        content: status?.markdownResult || "",
        timestamp: Date.now(),
        type: file.type
      }
    })

    const existingHistory = JSON.parse(localStorage.getItem('conversion-history') || '[]')
    const updatedHistory = [...historyItems, ...existingHistory]
    localStorage.setItem('conversion-history', JSON.stringify(updatedHistory))

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'conversion-history',
      newValue: JSON.stringify(updatedHistory)
    }))

    const result = confirm(
      `Successfully uploaded ${completedFiles.length} files to history with .md extension!\n\n` +
      `Click OK to go directly to Step 3 (Generation), or Cancel to stay here.`
    )

    if (result && onNavigateToStep) {
      onNavigateToStep(3)
    }
  }

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
  
  const getConvertedContent = (fileId: string) => {
    const status = conversionStatuses.find(s => s.fileId === fileId)
    return status?.markdownResult || "No converted content available from conversion step"
  }

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
  const allCompleted = conversionStatuses.every((s) => s.status === "completed")

  if (isFullscreen && selectedFileData) {
    return (
      <FullscreenPreview
        selectedFileData={selectedFileData}
        fileTypeLabels={fileTypeLabels}
        getConvertedContent={getConvertedContent}
        onRegenerate={onRegenerate}
        isConverting={isConverting}
        onClose={() => setIsFullscreen(false)}
      />
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
            <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
              <div className="flex items-center space-x-2">
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
              {isDevMode() && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  🚀 Mock APIs
                </Badge>
              )}
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
              <div className="xl:col-span-1 space-y-3">
                <h3 className="font-medium">Converted Files</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {uploadedFiles.filter(file => {
                    const status = conversionStatuses.find(s => s.fileId === file.id)
                    return status?.status === "completed"
                  }).map((file) => (
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
                  ))}
                </div>
              </div>

              <div className="xl:col-span-4">
                {selectedFileData && getConvertedContent(selectedFileData.id) !== "No converted content available from conversion step" && (
                  <FilePreviewTabs
                    selectedFileData={selectedFileData}
                    getConvertedContent={getConvertedContent}
                    onRegenerate={onRegenerate}
                    onFullscreen={() => setIsFullscreen(true)}
                    isConverting={isConverting}
                  />
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