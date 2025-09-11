"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FileType } from "@/app/page"

interface FileUploadBoxProps {
  acceptedTypes: string[]
  fileType: FileType
  label: string
  description: string
  onFileUploaded: (file: File, type: FileType) => void
  maxSize?: number
  className?: string
}

export function FileUploadBox({
  acceptedTypes,
  fileType,
  label,
  description,
  onFileUploaded,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className
}: FileUploadBoxProps) {
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors?.[0]?.code === 'file-too-large') {
        setError(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`)
      } else if (rejection.errors?.[0]?.code === 'file-invalid-type') {
        setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`)
      } else {
        setError('File upload failed')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadedFile(file)
      onFileUploaded(file, fileType)
    }
  }, [acceptedTypes, fileType, onFileUploaded, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: false
  })

  const removeFile = () => {
    setUploadedFile(null)
    setError(null)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          error ? "border-red-300 bg-red-50" : "",
          uploadedFile ? "border-green-300 bg-green-50" : ""
        )}
      >
        <input {...getInputProps()} />
        
        {uploadedFile ? (
          <div className="space-y-2">
            <File className="h-8 w-8 text-green-600 mx-auto" />
            <div>
              <p className="font-medium text-green-800">{uploadedFile.name}</p>
              <p className="text-sm text-green-600">
                {Math.round(uploadedFile.size / 1024)} KB • Uploaded
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className={cn(
              "h-8 w-8 mx-auto",
              error ? "text-red-400" : "text-muted-foreground"
            )} />
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {acceptedTypes.join(', ')} • Max {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
