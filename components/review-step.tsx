"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface ReviewStepProps {
  uploadedFiles: UploadedFile[]
  isConverting: boolean
  onConfirm: () => void
  onRegenerate: (fileId: string) => void
  onBack: () => void
  selectedStream: StreamType | null
}

export function ReviewStep({
  uploadedFiles,
  isConverting,
  onConfirm,
  onRegenerate,
  onBack,
  selectedStream,
}: ReviewStepProps) {
  const [selectedFile, setSelectedFile] = useState(uploadedFiles[0]?.id || "")

  const fileTypeLabels = {
    api: "API Files",
    design: "Detailed Design",
    scenario: "Business Scenario",
    error: "Error Code",
  }

  const selectedFileData = uploadedFiles.find((file) => file.id === selectedFile)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Converted Files</CardTitle>
        <CardDescription>
          Review the converted Markdown files for {selectedStream} test case generation. If any file doesn't look
          correct, you can regenerate it.
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
              Files have been converted with focus on {selectedStream} test case requirements
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File List */}
          <div className="space-y-3">
            <h3 className="font-medium">Converted Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFile === file.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedFile(file.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {fileTypeLabels[file.type]}
                        </Badge>
                      </div>
                    </div>
                    {file.convertedContent ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Preview */}
          <div className="lg:col-span-2">
            {selectedFileData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedFileData.name}</h3>
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
                </div>

                <Tabs defaultValue="markdown" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="original">Original HTML</TabsTrigger>
                    <TabsTrigger value="markdown">Converted Markdown</TabsTrigger>
                  </TabsList>

                  <TabsContent value="original" className="mt-4">
                    <ScrollArea className="h-96 w-full border rounded-lg p-4">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedFileData.content}
                      </pre>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="markdown" className="mt-4">
                    <ScrollArea className="h-96 w-full border rounded-lg p-4">
                      <div className="prose prose-sm max-w-none">
                        <pre className="text-sm whitespace-pre-wrap">
                          {selectedFileData.convertedContent || "No converted content available"}
                        </pre>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="font-medium">Are the files correct and match your documents?</p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Please review each converted file to ensure the content is accurate. If any file needs adjustment, use the
            "Regenerate" button to convert it again.
          </p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isConverting}>
            Back
          </Button>
          <Button onClick={onConfirm} disabled={isConverting} className="min-w-32">
            Files Look Good - Generate Test Cases
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
