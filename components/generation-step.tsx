"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Loader2, CheckCircle } from "lucide-react"
import type { UploadedFile, StreamType } from "@/app/page"

interface GenerationStepProps {
  uploadedFiles: UploadedFile[]
  isGenerating: boolean
  onGenerate: () => void
  onBack: () => void
  selectedStream: StreamType | null
}

export function GenerationStep({
  uploadedFiles,
  isGenerating,
  onGenerate,
  onBack,
  selectedStream,
}: GenerationStepProps) {
  const fileTypeLabels = {
    api: "API Files",
    design: "Detailed Design",
    scenario: "Business Scenario",
    error: "Error Code",
  }

  const handleDownloadCSV = () => {
    const businessCsvContent = `Test Case ID,Description,Expected Result,Priority,Category
TC001,Verify user login workflow,User should be authenticated successfully,High,Business Logic
TC002,Test order processing flow,Order should be processed without errors,High,Business Process
TC003,Validate payment integration,Payment should complete successfully,High,Business Logic
TC004,Check user profile management,Profile updates should be saved correctly,Medium,User Management`

    const validationCsvContent = `Test Case ID,Description,Expected Result,Priority,Category
TC001,Validate email format input,System should accept valid email formats only,High,Input Validation
TC002,Test password strength requirements,System should enforce password complexity rules,High,Data Validation
TC003,Verify field length limits,System should reject inputs exceeding maximum length,Medium,Boundary Testing
TC004,Test SQL injection prevention,System should sanitize all user inputs,High,Security Validation`

    const csvContent = selectedStream === "business" ? businessCsvContent : validationCsvContent
    const filename = `${selectedStream}-test-cases.csv`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getGenerationDescription = () => {
    if (selectedStream === "business") {
      return {
        title: "Business Test Case Generation",
        description: "Generate test cases focused on business logic, user workflows, and functional requirements.",
        features: [
          "• Business workflow validation tests",
          "• User story acceptance criteria",
          "• Functional requirement verification",
          "• End-to-end process testing",
        ],
      }
    } else {
      return {
        title: "Validation Test Case Generation",
        description: "Generate test cases focused on data validation, input verification, and error handling.",
        features: [
          "• Input validation and sanitization tests",
          "• Data integrity and boundary testing",
          "• Error handling and edge cases",
          "• Security validation scenarios",
        ],
      }
    }
  }

  const generationInfo = getGenerationDescription()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{generationInfo.title}</CardTitle>
        <CardDescription>{generationInfo.description}</CardDescription>
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
            <span className="text-sm text-muted-foreground">Generating {selectedStream} focused test cases</span>
          </div>
        )}

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
              <p className="font-medium">Generating {selectedStream} Test Cases...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing your documents and creating comprehensive {selectedStream} test scenarios
              </p>
            </div>
            <Progress value={65} className="w-full" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Processing documents for {selectedStream} test case generation...
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
              Your documents have been processed and are ready for {selectedStream} test case generation.
            </p>
            <div className="bg-accent/10 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">What will be generated:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {generationInfo.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
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
                `Generate ${selectedStream} Test Cases`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
