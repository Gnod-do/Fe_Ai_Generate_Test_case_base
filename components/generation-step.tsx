"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Loader2, CheckCircle } from "lucide-react"
import type { UploadedFile } from "@/app/page"

interface GenerationStepProps {
  uploadedFiles: UploadedFile[]
  isGenerating: boolean
  onGenerate: () => void
  onBack: () => void
}

export function GenerationStep({ uploadedFiles, isGenerating, onGenerate, onBack }: GenerationStepProps) {
  const fileTypeLabels = {
    api: "API Files",
    design: "Detailed Design",
    scenario: "Business Scenario",
    error: "Error Code",
  }

  const handleDownloadCSV = () => {
    // Mock CSV content - in real app, this would be the actual generated test cases
    const csvContent = `Test Case ID,Description,Expected Result,Priority,Category
TC001,Verify API endpoint authentication,User should be authenticated successfully,High,API
TC002,Test error handling for invalid input,System should return appropriate error message,Medium,Error Handling
TC003,Validate business scenario workflow,Process should complete without errors,High,Business Logic
TC004,Check design implementation,UI should match design specifications,Medium,UI/UX`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "generated-test-cases.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Test Cases</CardTitle>
        <CardDescription>Generate comprehensive test cases based on your converted documents.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Source Documents Summary</h3>
          <div className="grid gap-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <Badge variant="outline">{fileTypeLabels[file.type]}</Badge>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            ))}
          </div>
        </div>

        {isGenerating && (
          <div className="space-y-4 p-6 bg-muted rounded-lg">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="font-medium">Generating Test Cases...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing your documents and creating comprehensive test scenarios
              </p>
            </div>
            <Progress value={65} className="w-full" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Processing API specifications, design requirements, and error scenarios...
              </p>
            </div>
          </div>
        )}

        {!isGenerating && uploadedFiles.length > 0 && (
          <div className="space-y-4 p-6 border rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-medium">Ready to Generate</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your documents have been processed and are ready for test case generation. The system will analyze your
              API specifications, design documents, business scenarios, and error codes to create comprehensive test
              cases.
            </p>
            <div className="bg-accent/10 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">What will be generated:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Functional test cases based on API specifications</li>
                <li>• UI/UX test scenarios from design documents</li>
                <li>• Business workflow validation tests</li>
                <li>• Error handling and edge case scenarios</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isGenerating}>
            Back
          </Button>
          <div className="space-x-2">
            {!isGenerating && uploadedFiles.some((f) => f.convertedContent) && (
              <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download Sample CSV
              </Button>
            )}
            <Button onClick={onGenerate} disabled={isGenerating} className="min-w-32">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Test Cases"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
