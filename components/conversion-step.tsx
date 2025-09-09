"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface ConversionStepProps {
  uploadedFiles: UploadedFile[]
  isConverting: boolean
  onConvert: () => void
  onBack: () => void
  selectedStream: StreamType | null
}

interface ConversionStatus {
  fileId: string
  status: "pending" | "converting" | "completed" | "error"
  error?: string
}

export function ConversionStep({
  uploadedFiles,
  isConverting,
  onConvert,
  onBack,
  selectedStream,
}: ConversionStepProps) {
  const [conversionStatuses, setConversionStatuses] = useState<ConversionStatus[]>([])

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

  const handleConvertFiles = async () => {
    console.log("[v0] Starting conversion process")

    for (const file of uploadedFiles) {
      // Update status to converting
      setConversionStatuses((prev) =>
        prev.map((status) => (status.fileId === file.id ? { ...status, status: "converting" } : status)),
      )

      try {
        const prompt = `Convert the following HTML content to Markdown format:\n\n${file.content}`

        const response = await fetch("http://localhost:5678/webhook-test/html-to-md", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt,
            fileName: file.name,
            fileType: file.type,
            stream: selectedStream,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log("[v0] Conversion successful for:", file.name)

        // Update status to completed
        setConversionStatuses((prev) =>
          prev.map((status) => (status.fileId === file.id ? { ...status, status: "completed" } : status)),
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

    console.log("[v0] All conversions completed")
    onConvert() // Proceed to next step
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to Markdown</CardTitle>
        <CardDescription>
          Convert your uploaded HTML files to Markdown format for {selectedStream} test case generation. Files will be
          processed sequentially.
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
            <span className="text-sm text-muted-foreground">Files will be processed sequentially via API</span>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-medium">Files Ready for Conversion</h3>
          <div className="grid gap-3">
            {uploadedFiles.map((file) => {
              const status = conversionStatuses.find((s) => s.fileId === file.id)
              return (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                    {status?.error && (
                      <span className="text-xs text-red-600 max-w-32 truncate" title={status.error}>
                        {status.error}
                      </span>
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
          <Button onClick={handleConvertFiles} disabled={isConverting} className="min-w-32">
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              "Convert to MD"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
