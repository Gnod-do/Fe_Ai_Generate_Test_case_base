"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, Loader2 } from "lucide-react"
import type { UploadedFile } from "@/app/page"

interface ConversionStepProps {
  uploadedFiles: UploadedFile[]
  isConverting: boolean
  onConvert: () => void
  onBack: () => void
}

export function ConversionStep({ uploadedFiles, isConverting, onConvert, onBack }: ConversionStepProps) {
  const fileTypeLabels = {
    api: "API Files",
    design: "Detailed Design",
    scenario: "Business Scenario",
    error: "Error Code",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to Markdown</CardTitle>
        <CardDescription>
          Review your uploaded files and convert them to Markdown format for processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="font-medium">Files Ready for Conversion</h3>
          <div className="grid gap-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <Badge variant="outline">{fileTypeLabels[file.type]}</Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <span className="text-sm">HTML</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm">Markdown</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isConverting && (
          <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="font-medium">Converting files to Markdown...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments depending on file size</p>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isConverting}>
            Back
          </Button>
          <Button onClick={onConvert} disabled={isConverting} className="min-w-32">
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
