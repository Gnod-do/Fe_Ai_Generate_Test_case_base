"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X, CheckCircle, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedFile, StreamType, FileType } from "@/app/page"

interface FileUploadStepProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onNext: () => void
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
    label: "📋 Yêu Cầu Nghiệp Vụ",
    friendlyName: "Tài Liệu Chính",
    description: "Tải lên tài liệu yêu cầu nghiệp vụ chính",
    helpText: "Đây là tài liệu đặc tả chính mô tả những gì cần được kiểm thử",
    color: "bg-purple-100 text-purple-800",
    icon: "📋",
    examples: "Yêu cầu nghiệp vụ, đặc tả, quy trình làm việc",
    required: true
  },
  {
    type: "detail-api",
    label: "🔧 Thiết Kế Chi Tiết Kỹ Thuật", 
    friendlyName: "Tài Liệu API",
    description: "Tải lên thiết kế chi tiết kỹ thuật API",
    helpText: "Tải lên tài liệu API hiển thị endpoints, tham số và phản hồi",
    color: "bg-blue-100 text-blue-800",
    icon: "🔧",
    examples: "Đặc tả API, endpoints, tài liệu chi tiết",
    required: true
  },
  {
    type: "api-integration",
    label: "🔗 Hướng Dẫn Tích Hợp",
    friendlyName: "Tích Hợp Hệ Thống",
    description: "Tải lên tài liệu tích hợp API (tùy chọn - cho phép nhiều tài liệu)",
    helpText: "Tài liệu tích hợp bổ sung - bạn có thể tải lên nhiều tài liệu ở đây",
    color: "bg-green-100 text-green-800",
    icon: "🔗",
    examples: "Hướng dẫn tích hợp, kết nối API, tài liệu tích hợp hệ thống",
    required: false,
    allowMultiple: true
  },
  {
    type: "uml-image",
    label: "🖼️ Sơ Đồ UML",
    friendlyName: "Biểu Đồ UML",
    description: "Tải lên hình ảnh sơ đồ UML (tùy chọn)",
    helpText: "Tải lên sơ đồ UML sẽ được xử lý và thêm vào yêu cầu nghiệp vụ",
    color: "bg-yellow-100 text-yellow-800",
    icon: "🖼️",
    examples: "Sơ đồ UML, biểu đồ luồng, sơ đồ hệ thống",
    required: false
  },
]

const validationFileBoxes: FileBoxConfig[] = [
  {
    type: "validation",
    label: "✅ Tài Liệu Kiểm Thử",
    friendlyName: "Tài Liệu Kiểm Thử",
    description: "Tải lên một tài liệu để tạo test cases kiểm thử kỹ thuật",
    helpText: "Bất kỳ tài liệu nào chứa quy tắc kiểm thử hoặc cấu trúc dữ liệu cần kiểm tra",
    color: "bg-orange-100 text-orange-800", 
    icon: "✅",
    examples: "Bất kỳ tài liệu nào để kiểm thử kỹ thuật",
    required: true
  },
]

export function FileUploadStep({
  onFilesUploaded,
  onNext,
  onBack,
  uploadedFiles,
  selectedStream,
  onDeleteFile,
}: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState<string | null>(null)
  const [removingFileId, setRemovingFileId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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

  const handleFiles = async (files: File[], boxType: FileType) => {
    // For validation stream, only allow one file total
    if (selectedStream === "validation" && (uploadedFiles.length > 0 || files.length > 1)) {
      alert("Luồng kiểm thử chỉ cho phép một tài liệu. Vui lòng xóa tài liệu hiện có trước.")
      return
    }

    // For business stream, only allow one file per type (except api-integration which allows multiple)
    if (selectedStream === "business" && boxType !== "api-integration") {
      const existingFilesOfType = uploadedFiles.filter(f => f.type === boxType)
      if (existingFilesOfType.length > 0 || files.length > 1) {
        alert(`Chỉ cho phép một tài liệu ${boxType}. Vui lòng xóa tài liệu hiện có trước.`)
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

    // Preserve existing files and their converted content, but remove files of the same type to replace them
    // Exception: api-integration allows multiple files
    const existingMap = new Map(uploadedFiles.map(file => [file.id, file]))
    const filteredFiles = boxType === "api-integration" 
      ? uploadedFiles 
      : uploadedFiles.filter((f) => f.type !== boxType)
    
    // Merge preserved files with new files
    const mergedFiles = [...filteredFiles, ...newFiles].map(file => {
      const existing = existingMap.get(file.id)
      return existing?.convertedContent 
        ? { ...file, convertedContent: existing.convertedContent }
        : file
    })
    
    onFilesUploaded(mergedFiles)
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
    
    const confirmMessage = `Bạn có chắc muốn xóa tất cả ${filesToRemove.length} tài liệu ${boxType}?`
    if (window.confirm(confirmMessage)) {
      // Remove all files of this type
      const remainingFiles = uploadedFiles.filter(file => file.type !== boxType)
      onFilesUploaded(remainingFiles)
    }
  }

  const removeFile = async (fileId: string, fileName: string) => {
    // Optional: Add confirmation dialog for better UX
    if (window.confirm(`Bạn có chắc muốn xóa "${fileName}"?`)) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tải Lên Tài Liệu HTML</CardTitle>
        <CardDescription>
          {selectedStream === "validation" 
            ? "Tải lên một tài liệu HTML để tạo test cases kiểm thử kỹ thuật." 
            : selectedStream === "business"
            ? "Tải lên tài liệu HTML để tạo test cases kịch bản nghiệp vụ. Yêu cầu nghiệp vụ và thiết kế chi tiết kỹ thuật là bắt buộc, tích hợp API và UML là tùy chọn."
            : "Tải lên tài liệu của bạn để tạo test cases. Chọn đúng danh mục cho từng loại tài liệu để tối ưu chất lượng test case."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Type Explanation */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📋 Hướng Dẫn Phân Loại Tài Liệu</h4>
          <div className="grid gap-2 text-sm">
            {selectedStream === "business" ? (
              <>
                <div><span className="font-medium text-purple-800">📋 Tài Liệu Nghiệp Vụ:</span> Yêu cầu nghiệp vụ, đặc tả và quy trình làm việc</div>
                <div><span className="font-medium text-blue-800">🔧 Thiết Kế Chi Tiết API:</span> Tài liệu API chi tiết và đặc tả kỹ thuật</div>
                <div><span className="font-medium text-green-800">🔗 Tích Hợp API:</span> Hướng dẫn tích hợp và tài liệu kết nối API (cho phép nhiều tài liệu)</div>
                <div><span className="font-medium text-yellow-800">🖼️ Sơ Đồ UML:</span> Biểu đồ UML sẽ được xử lý và thêm vào yêu cầu nghiệp vụ</div>
              </>
            ) : (
              <div><span className="font-medium text-orange-800">✅ Tài Liệu Kiểm Thử:</span> Bất kỳ tài liệu nào để tạo test cases kiểm thử kỹ thuật</div>
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
                      Ví dụ: {box.examples}
                    </p>
                    {hasFiles && (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {boxFiles.length} tài liệu đã tải lên
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
                          Xóa Tất Cả
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

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
                if (window.confirm(`Bạn có chắc muốn xóa tất cả ${uploadedFiles.length} tài liệu đã tải lên?`)) {
                  onFilesUploaded([])
                }
              }}
              className="hover:bg-destructive/10 hover:text-destructive text-sm"
            >
              Xóa Tất Cả Tài Liệu ({uploadedFiles.length})
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
            Quay Lại
          </Button>
          <Button onClick={onNext} disabled={uploadedFiles.length === 0} className="min-w-32">
            {uploadedFiles.length === 0 
              ? "Không Có Tài Liệu Để Chuyển Đổi" 
              : `Chuyển Đổi ${uploadedFiles.length} Tài Liệu`
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
