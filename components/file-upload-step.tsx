"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedFile, StreamType, FileType } from "@/app/page"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FileUploadStepProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onNext: () => void
  onSkipToGeneration: () => void
  onBack: () => void
  uploadedFiles: UploadedFile[]
  selectedStream: StreamType | null
  onDeleteFile: (fileId: string) => void
}

interface FileBoxConfig {
  type: FileType;
  label: string;
  friendlyName: string;
  description: string;
  helpText: string;
  color: string;
  icon: string;
  examples: string;
  required: boolean;
  allowMultiple?: boolean;
}

const businessFileBoxes: FileBoxConfig[] = [
  {
    type: "business",
    label: "📋 Business Requirements",
    friendlyName: "Main Documentation",
    description: "Upload your primary business requirements document",
    helpText: "This is your main specification document that describes what needs to be tested",
    color: "bg-purple-100 text-purple-800",
    icon: "📋",
    examples: "Business requirements, specifications, workflows",
    required: true
  },
  {
    type: "detail-api",
    label: "🔧 Technical Specifications", 
    friendlyName: "API Documentation",
    description: "Upload detailed technical API specifications",
    helpText: "Upload API documentation that shows endpoints, parameters, and responses",
    color: "bg-blue-100 text-blue-800",
    icon: "🔧",
    examples: "API specifications, endpoints, detailed documentation",
    required: true
  },
  {
    type: "api-integration",
    label: "🔗 Integration Guides",
    friendlyName: "System Integration",
    description: "Upload API integration documents (optional - multiple files allowed)",
    helpText: "Additional integration documentation - you can upload multiple files here",
    color: "bg-green-100 text-green-800",
    icon: "🔗",
    examples: "Integration guides, API connections, system integration docs",
    required: false,
    allowMultiple: true
  },
  {
    type: "uml-image",
    label: "🖼️ UML Image",
    friendlyName: "UML Diagram",
    description: "Upload a UML diagram image (optional)",
    helpText: "Upload a UML diagram that will be processed and added to your business requirements",
    color: "bg-yellow-100 text-yellow-800",
    icon: "🖼️",
    examples: "UML diagrams, flowcharts, system diagrams",
    required: false
  },
]

const validationFileBoxes: FileBoxConfig[] = [
  {
    type: "validation",
    label: "✅ Validation Document",
    friendlyName: "Validation Document",
    description: "Upload a single document for validation test case generation",
    helpText: "Any document that contains validation rules or data structures to test",
    color: "bg-orange-100 text-orange-800", 
    icon: "✅",
    examples: "Any document for validation testing",
    required: true
  },
]

export function FileUploadStep({
  onFilesUploaded,
  onNext,
  onSkipToGeneration,
  onBack,
  uploadedFiles,
  selectedStream,
  onDeleteFile,
}: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState<string | null>(null)
  const [removingFileId, setRemovingFileId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [manualBoxType, setManualBoxType] = useState<FileType | null>(null)
  const [manualName, setManualName] = useState("")
  const [manualContent, setManualContent] = useState("")

  // Get the appropriate file boxes based on selected stream
  const currentFileBoxes = selectedStream === "validation" ? validationFileBoxes :
                          selectedStream === "business" ? businessFileBoxes :
                          businessFileBoxes // Default to business for any other case

  const handleDrag = useCallback((e: React.DragEvent, boxType?: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(boxType || null)
    } else if (e.type === "dragleave") {
      setDragActive(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, boxType: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files, boxType as FileType)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, boxType: FileType) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files, boxType)
  }

  const addFilesToState = (newFiles: UploadedFile[], boxType: FileType) => {
    if (selectedStream === "validation" && uploadedFiles.some(file => file.type === boxType)) {
      alert("Validation stream only allows one document. Please remove the existing entry first.")
      return
    }

    if (selectedStream === "validation" && newFiles.length > 1) {
      alert("Validation stream only accepts a single document at a time.")
      return
    }

    if (selectedStream === "business" && boxType !== "api-integration" && uploadedFiles.some(f => f.type === boxType)) {
      alert(`Only one ${boxType} entry is allowed. Please remove the existing one first.`)
      return
    }

    const filteredFiles = boxType === "api-integration"
      ? uploadedFiles
      : uploadedFiles.filter((f) => f.type !== boxType)

    onFilesUploaded([...filteredFiles, ...newFiles])
  }

  const handleFiles = async (files: File[], boxType: FileType) => {
    if (selectedStream === "validation" && (uploadedFiles.length > 0 || files.length > 1)) {
      alert("Validation stream only allows one document. Please remove existing files first.")
      return
    }

    if (selectedStream === "business" && boxType !== "api-integration") {
      const existingFilesOfType = uploadedFiles.filter(f => f.type === boxType)
      if (existingFilesOfType.length > 0 || files.length > 1) {
        alert(`Only one ${boxType} file is allowed. Please remove the existing file first.`)
        return
      }
    }

    const newFiles: UploadedFile[] = []

    for (const file of files) {
      const content = await readFileContent(file)
      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: boxType,
        content: content,
      })
    }

    addFilesToState(newFiles, boxType)
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      
      // For image files, read as data URL (base64)
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  const removeAllFilesOfType = async (boxType: FileType) => {
    const filesToRemove = uploadedFiles.filter(file => file.type === boxType)
    if (filesToRemove.length === 0) return
    
    const confirmMessage = `Are you sure you want to remove all ${filesToRemove.length} ${boxType} file${filesToRemove.length > 1 ? 's' : ''}?`
    if (window.confirm(confirmMessage)) {
      // Remove all files of this type
      const remainingFiles = uploadedFiles.filter(file => file.type !== boxType)
      onFilesUploaded(remainingFiles)
    }
  }

  const removeFile = async (fileId: string, fileName: string) => {
    // Optional: Add confirmation dialog for better UX
    if (window.confirm(`Are you sure you want to remove "${fileName}"?`)) {
      setRemovingFileId(fileId)
      try {
        // Add a small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 300))
        onDeleteFile(fileId)
      } finally {
        setRemovingFileId(null)
      }
    }
  }

  const getFilesForBox = (boxType: string) => {
    return uploadedFiles.filter((file) => file.type === boxType)
  }

  const openManualDialog = (boxType: FileType, suggestedName: string) => {
    setManualBoxType(boxType)
    setManualName(suggestedName)
    setManualContent("")
    setManualDialogOpen(true)
  }

  const handleManualSubmit = () => {
    if (!manualBoxType) return

    if (!manualContent.trim()) {
      setValidationErrors(prev => ({ ...prev, manualContent: "Content is required" }))
      return
    }

    const trimmedName = manualName.trim() || `${manualBoxType}-manual-${new Date().toISOString().split('T')[0]}.md`

    const manualFile: UploadedFile = {
      id: `${Date.now()}-${Math.random()}`,
      name: trimmedName,
      type: manualBoxType,
      content: manualContent,
      convertedContent: manualContent,
      isManual: true,
    }

    addFilesToState([manualFile], manualBoxType)
    setManualDialogOpen(false)
    setManualBoxType(null)
    setValidationErrors(prev => ({ ...prev, manualContent: "" }))
  }

  const allFilesHaveConvertedContent = uploadedFiles.length > 0 && uploadedFiles.every(file => !!file.convertedContent && file.convertedContent.trim() !== "")

  const validateRequiredFiles = () => {
    if (!selectedStream) return false

    if (selectedStream === "business") {
      const hasBusiness = uploadedFiles.some(file => file.type === "business")
      const hasDetailApi = uploadedFiles.some(file => file.type === "detail-api")

      if (!hasBusiness) {
        alert("Business stream requires both Business and Detail API documents.")
        return false
      }
    }

    if (selectedStream === "validation") {
      const hasValidation = uploadedFiles.some(file => file.type === "validation")
      if (!hasValidation) {
        alert("Validation stream requires a Validation document.")
        return false
      }
    }

    return true
  }

  const handleConvertClick = () => {
    if (!validateRequiredFiles()) return
    onNext()
  }

  const handleSkipClick = () => {
    if (!validateRequiredFiles()) return
    onSkipToGeneration()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload HTML Documents</CardTitle>
        <CardDescription>
          {selectedStream === "validation" 
            ? "Upload a single HTML document for validation test case generation." 
            : selectedStream === "business"
            ? "Upload HTML documents for business test case generation. Business and Detail API documents are required, API Integration and UML Image documents are optional."
            : "Upload your documents for test case generation. Choose the correct category for each type of document to optimize test case quality."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Type Explanation */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📋 File Categories Guide</h4>
          <div className="grid gap-2 text-sm">
            {selectedStream === "business" ? (
              <>
                <div><span className="font-medium text-purple-800">📋 Business Document:</span> Business requirements, specifications, and workflows</div>
                <div><span className="font-medium text-blue-800">🔧 Detail API:</span> Detailed API documentation and specifications</div>
                <div><span className="font-medium text-green-800">🔗 API Integration:</span> Integration guides and API connection documents (multiple files allowed)</div>
                <div><span className="font-medium text-yellow-800">🖼️ UML Image:</span> UML diagrams that will be processed and added to business requirements</div>
              </>
            ) : (
              <div><span className="font-medium text-orange-800">✅ Validation Document:</span> Any single document for validation test case generation</div>
            )}
          </div>
        </div>
        
        <div className={`grid gap-4 ${selectedStream === "validation" ? "md:grid-cols-1 max-w-md mx-auto" : "md:grid-cols-3"}`}>
          {currentFileBoxes.map((box) => {
            const boxFiles = getFilesForBox(box.type)
            const hasFiles = boxFiles.length > 0

            return (
              <div key={box.type} className="space-y-3">
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer min-h-[200px] flex flex-col justify-center",
                    dragActive === box.type ? "border-primary bg-primary/5" : "border-border",
                    hasFiles ? "border-green-500 bg-green-50" : "hover:border-primary/50 hover:bg-primary/5",
                  )}
                  onDragEnter={(e) => handleDrag(e, box.type)}
                  onDragLeave={handleDrag}
                  onDragOver={(e) => handleDrag(e, box.type)}
                  onDrop={(e) => handleDrop(e, box.type)}
                  onClick={() => document.getElementById(`file-input-${box.type}`)?.click()}
                >
                  {hasFiles ? (
                    <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  ) : (
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{box.icon}</span>
                      <p className="font-medium">{box.label}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{box.description}</p>
                    <p className="text-xs text-muted-foreground italic">
                      Examples: {box.examples}
                    </p>
                    {hasFiles && (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {boxFiles.length} file{boxFiles.length > 1 ? "s" : ""} uploaded
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeAllFilesOfType(box.type)
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive text-xs h-6 px-2"
                          title={`Clear all ${box.label} files`}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {box.type !== "uml-image" && (
                  <div className="flex justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const suggestedName = box.type === "validation"
                          ? "validation-manual-entry.md"
                          : `${box.type}-manual-entry.md`
                        openManualDialog(box.type, suggestedName)
                      }}
                    >
                      Paste text instead
                    </Button>
                  </div>
                )}

                <input
                  id={`file-input-${box.type}`}
                  type="file"
                  multiple={selectedStream === "business" && box.type === "api-integration"}
                  accept={box.type === "uml-image" ? ".png,.jpg,.jpeg,.gif,.bmp,.svg" : ".html,.htm"}
                  onChange={(e) => handleFileInput(e, box.type)}
                  className="hidden"
                />

                {boxFiles.length > 0 && (
                  <div className="space-y-2">
                    {boxFiles.map((file) => {
                      const isRemoving = removingFileId === file.id
                      return (
                        <div key={file.id} className={cn(
                          "flex items-start justify-between p-2 bg-muted rounded text-sm transition-opacity gap-2",
                          isRemoving && "opacity-50"
                        )}>
                          <div className="flex items-start space-x-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="break-words leading-5">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isRemoving}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeFile(file.id, file.name)
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive h-6 w-6 p-0 flex-shrink-0"
                            title={`Remove ${file.name}`}
                            aria-label={`Remove ${file.name}`}
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove all ${uploadedFiles.length} uploaded files?`)) {
                  onFilesUploaded([])
                }
              }}
              className="hover:bg-destructive/10 hover:text-destructive text-sm"
            >
              Clear All Files ({uploadedFiles.length})
            </Button>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              console.log("[v0] Back button clicked")
              onBack()
            }}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {allFilesHaveConvertedContent ? (
              <Button onClick={handleSkipClick} disabled={uploadedFiles.length === 0} className="min-w-36">
                Proceed to Generate
              </Button>
            ) : (
              <Button onClick={handleConvertClick} disabled={uploadedFiles.length === 0} className="min-w-32">
                {uploadedFiles.length === 0 
                  ? "No Files to Convert" 
                  : `Convert ${uploadedFiles.length} File${uploadedFiles.length > 1 ? 's' : ''}`
                }
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          setManualDialogOpen(open)
          if (!open) {
            setManualContent("")
            setManualName("")
            setValidationErrors(prev => ({ ...prev, manualContent: "" }))
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Paste document content</DialogTitle>
            <DialogDescription>
              Provide the document name and content. This will be treated the same as a converted file and will skip the conversion step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Document name</Label>
              <Input
                id="manual-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="business-requirements.md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-content">Content</Label>
              <textarea
                id="manual-content"
                value={manualContent}
                onChange={(e) => {
                  setManualContent(e.target.value)
                  if (validationErrors.manualContent) {
                    setValidationErrors(prev => ({ ...prev, manualContent: "" }))
                  }
                }}
                placeholder="Paste your Markdown content here"
                className={cn(
                  "w-full h-64 rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
              {validationErrors.manualContent && (
                <p className="text-sm text-red-600">{validationErrors.manualContent}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManualDialogOpen(false)
                setValidationErrors(prev => ({ ...prev, manualContent: "" }))
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} disabled={!manualContent.trim()}>
              Save Manual Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
