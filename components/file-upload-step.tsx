"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedFile, FileType, StreamType } from "@/app/page"

interface FileUploadStepProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onNext: () => void
  uploadedFiles: UploadedFile[]
  selectedStream: StreamType | null
}

const fileTypes: { type: FileType; label: string; color: string }[] = [
  { type: "api", label: "API Files", color: "bg-blue-100 text-blue-800" },
  { type: "design", label: "Detailed Design", color: "bg-green-100 text-green-800" },
  { type: "scenario", label: "Business Scenario", color: "bg-purple-100 text-purple-800" },
  { type: "error", label: "Error Code", color: "bg-red-100 text-red-800" },
]

export function FileUploadStep({ onFilesUploaded, onNext, uploadedFiles, selectedStream }: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      type: determineFileType(file.name),
      content: `Mock content for ${file.name}`, // In real app, read file content
    }))

    onFilesUploaded([...uploadedFiles, ...newFiles])
  }

  const determineFileType = (filename: string): FileType => {
    const lower = filename.toLowerCase()
    if (lower.includes("api")) return "api"
    if (lower.includes("design")) return "design"
    if (lower.includes("scenario") || lower.includes("business")) return "scenario"
    if (lower.includes("error")) return "error"
    return "api" // default
  }

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((file) => file.id !== fileId)
    onFilesUploaded(updatedFiles)
  }

  const getFileTypeInfo = (type: FileType) => {
    return fileTypes.find((ft) => ft.type === type) || fileTypes[0]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload HTML Documents</CardTitle>
        <CardDescription>
          Upload your documents for {selectedStream} test case generation. All files should be in HTML format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border",
            "hover:border-primary/50 hover:bg-primary/5",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Drop your HTML files here</p>
            <p className="text-muted-foreground">or click to browse</p>
          </div>
          <input
            type="file"
            multiple
            accept=".html,.htm"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Uploaded Files ({uploadedFiles.length})</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => {
                const typeInfo = getFileTypeInfo(file.type)
                return (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <Badge variant="secondary" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={uploadedFiles.length === 0} className="min-w-32">
            Next Step
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
