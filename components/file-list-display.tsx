"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, CheckCircle, AlertCircle, Clock, Edit, Trash2, RotateCcw } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface GenerationResult {
  fileId: string
  fileName: string
  status: "pending" | "generating" | "completed" | "error"
  csvData?: string
  error?: string
}

interface FileListDisplayProps {
  uploadedFiles: UploadedFile[]
  selectedStream: StreamType | null
  generationResults: GenerationResult[]
  currentGeneratingIndex: number
  isGenerating: boolean
  onModifyFile?: (fileId: string) => void
  onRemoveFile?: (fileId: string) => void
  onDownloadCSV: (result: GenerationResult) => void
  onRegenerateFile?: (fileId: string) => void
}

export function FileListDisplay({
  uploadedFiles,
  selectedStream,
  generationResults,
  currentGeneratingIndex,
  isGenerating,
  onModifyFile,
  onRemoveFile,
  onDownloadCSV,
  onRegenerateFile
}: FileListDisplayProps) {
  const filesWithContent = uploadedFiles.filter(file => file.convertedContent)

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {selectedStream === "business" ? "Files for Business Test Generation" : "Files for Validation Test Generation"}
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
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadCSV(generationResults[0])}
                          className="h-6 w-6 p-0"
                          title="Download CSV"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {onRegenerateFile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const confirmed = window.confirm(
                                "Are you sure you want to regenerate the business test cases? This will overwrite your current results."
                              )
                              if (confirmed) {
                                onRegenerateFile("business-combined")
                              }
                            }}
                            className="h-6 w-6 p-0"
                            title="Regenerate business test cases"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </>
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
                              {!isGenerating && (
                                <div className="flex items-center space-x-1">
                                  {onModifyFile && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onModifyFile(file.id)}
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
                                      onClick={() => onRemoveFile(file.id)}
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
                      {!isGenerating && (
                        <>
                          {onModifyFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onModifyFile(file.id)}
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
                              onClick={() => onRemoveFile(file.id)}
                              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              title="Remove file"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                      
                      {result && (
                        <>
                          {getStatusIcon(result.status)}
                          <span className="text-sm">{getStatusText(result.status)}</span>
                          {result.status === "completed" && result.csvData && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDownloadCSV(result)}
                                className="h-6 w-6 p-0"
                                title="Download CSV"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              {onRegenerateFile && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      `Are you sure you want to regenerate test cases for "${file.name}"? This will overwrite your current results.`
                                    )
                                    if (confirmed) {
                                      onRegenerateFile(file.id)
                                    }
                                  }}
                                  className="h-6 w-6 p-0"
                                  title="Regenerate test cases for this file"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </>
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
  )
}