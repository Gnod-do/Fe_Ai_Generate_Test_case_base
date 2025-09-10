"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2, CheckCircle, AlertCircle, Eye } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface ConversionStepProps {
  uploadedFiles: UploadedFile[]
  isConverting: boolean
  onConvert: () => void
  onBack: () => void
  selectedStream: StreamType | null
  onFileConverted: (fileId: string, convertedContent: string) => void
}

interface ConversionStatus {
  fileId: string
  status: "pending" | "converting" | "completed" | "error"
  error?: string
  markdownResult?: string
}

export function ConversionStep({
  uploadedFiles,
  isConverting,
  onConvert,
  onBack,
  selectedStream,
  onFileConverted,
}: ConversionStepProps) {
  const [conversionStatuses, setConversionStatuses] = useState<ConversionStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [viewingResult, setViewingResult] = useState<string | null>(null)

  useEffect(() => {
    setConversionStatuses(
      uploadedFiles.map((file) => ({
        fileId: file.id,
        status: "pending" as const,
      })),
    )
  }, [uploadedFiles])

  const fileTypeLabels = {
    api: "API Design",
    design: "Detailed Design",
    scenario: "Business Scenario",
  }

  const handleConvertCurrentFile = async () => {
    if (currentFileIndex >= uploadedFiles.length) return

    const file = uploadedFiles[currentFileIndex]
    console.log("[v0] Converting file:", file.name)

    // Update status to converting
    setConversionStatuses((prev) =>
      prev.map((status) => (status.fileId === file.id ? { ...status, status: "converting" } : status)),
    )

    try {
      const response = await fetch("http://localhost:5678/webhook-test/html-to-md", {
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
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] API Response:", result)

      let markdownContent = "Conversion completed"
      if (result.status === "success" && result.files && result.files.length > 0) {
        const base64Data = result.files[0].data
        if (base64Data) {
          try {
            // Convert base64 to binary string, then to UTF-8
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            markdownContent = new TextDecoder("utf-8").decode(bytes)
          } catch (decodeError) {
            console.error("[v0] Base64 decode error:", decodeError)
            // Fallback: try direct atob if UTF-8 decoding fails
            try {
              markdownContent = atob(base64Data)
            } catch (fallbackError) {
              console.error("[v0] Fallback decode error:", fallbackError)
              markdownContent = base64Data // Last resort: show raw data
            }
          }
        } else {
          markdownContent = "No content received"
        }
      }

      onFileConverted(file.id, markdownContent)

      // Update status to completed with result
      setConversionStatuses((prev) =>
        prev.map((status) =>
          status.fileId === file.id
            ? {
                ...status,
                status: "completed",
                markdownResult: markdownContent,
              }
            : status,
        ),
      )
    } catch (error) {
      console.error("[v0] Conversion failed for:", file.name, error)

      // Update status to error
      setConversionStatuses((prev) =>
        prev.map((status) =>
          status.fileId === file.id
            ? { ...status, status: "error", error: error instanceof Error ? error.message : "Unknown error" }
            : status,
        ),
      )
    }
  }

  const handleContinueToNext = () => {
    if (currentFileIndex < uploadedFiles.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1)
      setViewingResult(null)
    } else {
      // All files processed, proceed to next step
      onConvert()
    }
  }

  const handleViewResult = (fileId: string) => {
    const status = conversionStatuses.find((s) => s.fileId === fileId)
    if (status?.markdownResult) {
      setViewingResult(status.markdownResult)
    }
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
  const hasError = conversionStatuses.some((s) => s.status === "error")

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
              Back to Conversion
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to Markdown</CardTitle>
        <CardDescription>
          Convert your uploaded HTML files to Markdown format one by one for {selectedStream} test case generation.
          Progress: {currentFileIndex + 1} of {uploadedFiles.length} files
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
            <span className="text-sm text-muted-foreground">Converting files step by step</span>
          </div>
        )}

        {currentFile && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Currently Processing:</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(currentStatus?.status || "pending")}
                <div>
                  <p className="font-medium">{currentFile.name}</p>
                  <Badge variant="outline">{fileTypeLabels[currentFile.type as keyof typeof fileTypeLabels]}</Badge>
                </div>
              </div>
              <Badge variant="secondary" className={getStatusColor(currentStatus?.status || "pending")}>
                {currentStatus?.status || "pending"}
              </Badge>
            </div>
            {currentStatus?.error && <p className="text-sm text-red-600 mt-2">{currentStatus.error}</p>}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-medium">All Files Status</h3>
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
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <Badge variant="outline">{fileTypeLabels[file.type as keyof typeof fileTypeLabels]}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getStatusColor(status?.status || "pending")}>
                      {status?.status || "pending"}
                    </Badge>
                    {status?.status === "completed" && (
                      <Button variant="outline" size="sm" onClick={() => handleViewResult(file.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Result
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isConverting}>
            Back
          </Button>
          <div className="space-x-2">
            {currentStatus?.status === "completed" ? (
              <Button onClick={handleContinueToNext} className="min-w-32">
                {currentFileIndex < uploadedFiles.length - 1 ? "Continue to Next File" : "Proceed to Review"}
              </Button>
            ) : (
              <Button
                onClick={handleConvertCurrentFile}
                disabled={isConverting || currentStatus?.status === "converting"}
                className="min-w-32"
              >
                {currentStatus?.status === "converting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  `Convert ${fileTypeLabels[currentFile?.type as keyof typeof fileTypeLabels] || "File"}`
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
