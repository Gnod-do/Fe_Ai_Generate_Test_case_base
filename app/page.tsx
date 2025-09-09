"use client"

import { useState } from "react"
import { FileUploadStep } from "@/components/file-upload-step"
import { ConversionStep } from "@/components/conversion-step"
import { ReviewStep } from "@/components/review-step"
import { GenerationStep } from "@/components/generation-step"
import { ProgressIndicator } from "@/components/progress-indicator"
import { StreamSelectionStep } from "@/components/stream-selection-step"

export type FileType = "api" | "design" | "scenario" | "error"
export type StreamType = "business" | "validation"

export interface UploadedFile {
  id: string
  name: string
  type: FileType
  content: string
  convertedContent?: string
}

export default function TestCaseGenerator() {
  const [currentStep, setCurrentStep] = useState(0) // Start at step 0 for stream selection
  const [selectedStream, setSelectedStream] = useState<StreamType | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleStreamSelected = (stream: StreamType) => {
    setSelectedStream(stream)
    setCurrentStep(1)
  }

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files)
  }

  const handleConvertToMD = async () => {
    setIsConverting(true)
    // Simulate conversion process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock conversion - in real app, this would call your backend
    const convertedFiles = uploadedFiles.map((file) => ({
      ...file,
      convertedContent: `# Converted ${file.name}\n\nThis is the markdown version of ${file.name}.\n\n## Content\n\nOriginal HTML content has been converted to markdown format.`,
    }))

    setUploadedFiles(convertedFiles)
    setIsConverting(false)
    setCurrentStep(3)
  }

  const handleConfirmFiles = () => {
    setCurrentStep(4)
  }

  const handleRegenerateFile = async (fileId: string) => {
    setIsConverting(true)
    // Simulate regeneration
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const updatedFiles = uploadedFiles.map((file) =>
      file.id === fileId
        ? { ...file, convertedContent: `# Regenerated ${file.name}\n\nThis is the regenerated markdown version.` }
        : file,
    )

    setUploadedFiles(updatedFiles)
    setIsConverting(false)
  }

  const handleGenerateTestCases = async () => {
    setIsGenerating(true)
    console.log(`Generating ${selectedStream} test cases...`)
    // Simulate test case generation
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsGenerating(false)
  }

  const steps = [
    { number: 0, title: "Select Stream", description: "Choose test case type" },
    { number: 1, title: "Upload Files", description: "Upload HTML documents" },
    { number: 2, title: "Convert", description: "Convert to Markdown" },
    { number: 3, title: "Review", description: "Review converted files" },
    { number: 4, title: "Generate", description: "Generate test cases" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Test Case Generator</h1>
            <p className="text-muted-foreground">
              Choose your test case stream and convert HTML documents to generate comprehensive test cases
            </p>
          </header>

          <ProgressIndicator steps={steps} currentStep={currentStep} />

          <div className="mt-8">
            {currentStep === 0 && (
              <StreamSelectionStep onStreamSelected={handleStreamSelected} selectedStream={selectedStream} />
            )}

            {currentStep === 1 && (
              <FileUploadStep
                onFilesUploaded={handleFilesUploaded}
                onNext={() => setCurrentStep(2)}
                uploadedFiles={uploadedFiles}
                selectedStream={selectedStream}
              />
            )}

            {currentStep === 2 && (
              <ConversionStep
                uploadedFiles={uploadedFiles}
                isConverting={isConverting}
                onConvert={handleConvertToMD}
                onBack={() => setCurrentStep(1)}
                selectedStream={selectedStream}
              />
            )}

            {currentStep === 3 && (
              <ReviewStep
                uploadedFiles={uploadedFiles}
                isConverting={isConverting}
                onConfirm={handleConfirmFiles}
                onRegenerate={handleRegenerateFile}
                onBack={() => setCurrentStep(2)}
                selectedStream={selectedStream}
              />
            )}

            {currentStep === 4 && (
              <GenerationStep
                uploadedFiles={uploadedFiles}
                isGenerating={isGenerating}
                onGenerate={handleGenerateTestCases}
                onBack={() => setCurrentStep(3)}
                selectedStream={selectedStream}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
