"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedFile, StreamType } from "@/app/page"

interface FileUploadStepProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onNext: () => void
  onBack: () => void
  uploadedFiles: UploadedFile[]
  selectedStream: StreamType | null
}

const fileBoxes = [
  {
    type: "scenario" as const,
    label: "Business Scenario",
    description: "Upload business scenario HTML files",
    color: "bg-purple-100 text-purple-800",
  },
  {
    type: "api" as const,
    label: "API Design",
    description: "Upload API design HTML files",
    color: "bg-blue-100 text-blue-800",
  },
  {
    type: "design" as const,
    label: "Detailed Design",
    description: "Upload detailed design HTML files",
    color: "bg-green-100 text-green-800",
  },
]

export function FileUploadStep({
  onFilesUploaded,
  onNext,
  onBack,
  uploadedFiles,
  selectedStream,
}: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState<string | null>(null)

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
    handleFiles(files, boxType as "scenario" | "api" | "design")
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, boxType: "scenario" | "api" | "design") => {
    const files = Array.from(e.target.files || [])
    handleFiles(files, boxType)
  }

  const handleFiles = async (files: File[], boxType: "scenario" | "api" | "design") => {
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

    // Remove existing files of the same type and add new ones
    const filteredFiles = uploadedFiles.filter((f) => f.type !== boxType)
    onFilesUploaded([...filteredFiles, ...newFiles])
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const removeFile = (fileId: string) => {
    console.log("[v0] Removing file with ID:", fileId)
    const updatedFiles = uploadedFiles.filter((file) => file.id !== fileId)
    onFilesUploaded(updatedFiles)
  }

  const getFilesForBox = (boxType: string) => {
    return uploadedFiles.filter((file) => file.type === boxType)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload HTML Documents</CardTitle>
        <CardDescription>
          Upload your documents for {selectedStream} test case generation. Click on each box to upload the corresponding
          HTML files.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {fileBoxes.map((box) => {
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
                    <p className="font-medium">{box.label}</p>
                    <p className="text-sm text-muted-foreground">{box.description}</p>
                    {hasFiles && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {boxFiles.length} file{boxFiles.length > 1 ? "s" : ""} uploaded
                      </Badge>
                    )}
                  </div>
                </div>

                <input
                  id={`file-input-${box.type}`}
                  type="file"
                  multiple
                  accept=".html,.htm"
                  onChange={(e) => handleFileInput(e, box.type)}
                  className="hidden"
                />

                {boxFiles.length > 0 && (
                  <div className="space-y-2">
                    {boxFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeFile(file.id)
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

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
          <Button onClick={onNext} disabled={uploadedFiles.length === 0} className="min-w-32">
            Convert Files
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
