"use client"

import { useState, useEffect } from "react"
import { FileUploadStep } from "@/components/file-upload-step"
import { ConversionReviewStep } from "@/components/conversion-review-step"
import { GenerationStep } from "@/components/generation-step"
import { ProgressIndicator } from "@/components/progress-indicator"
import { StreamSelectionStep } from "@/components/stream-selection-step"
import { HistoryPanel, type HistoryItem } from "@/components/history-panel"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
export type FileType = "business" | "detail-api" | "api-integration" | "validation" | "error"
export type StreamType = "business" | "validation"

export interface UploadedFile {
  id: string
  name: string
  type: FileType
  content: string
  convertedContent?: string
}

interface ConversionStatus {
  fileId: string
  status: "pending" | "converting" | "completed" | "error"
  error?: string
  markdownResult?: string
}

interface ConversionData {
  statuses: ConversionStatus[]
  currentIndex: number
}

import { useLocalStorage } from "@/lib/hooks"

export default function TestCaseGenerator() {
  const [currentStep, setCurrentStep] = useLocalStorage('currentStep', 0)
  const [selectedStream, setSelectedStream] = useLocalStorage<StreamType | null>('selectedStream', null)
  const [uploadedFiles, setUploadedFiles] = useLocalStorage<UploadedFile[]>('uploadedFiles', [])
  const [isConverting, setIsConverting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null)

  // Effect to ensure localStorage data is properly loaded on mount
  useEffect(() => {
    console.log('=== Main Component Debug Info ===')
    console.log('Component mounted, checking localStorage...')
    console.log('Current selectedStream:', selectedStream)
    console.log('Current currentStep:', currentStep)
    
    if (typeof window !== 'undefined') {
      console.log('Raw localStorage values:')
      console.log('- selectedStream:', localStorage.getItem('selectedStream'))
      console.log('- currentStep:', localStorage.getItem('currentStep'))
    }
    
    // Force reload selectedStream if it's null but exists in localStorage
    if (!selectedStream) {
      const storedStream = localStorage.getItem('selectedStream')
      console.log('selectedStream is null, stored value:', storedStream)
      if (storedStream && storedStream !== 'null') {
        try {
          const parsedStream = JSON.parse(storedStream)
          console.log('Force loading selectedStream from localStorage:', parsedStream)
          setSelectedStream(parsedStream)
        } catch (error) {
          console.error('Error parsing selectedStream from localStorage:', error)
        }
      }
    }
    console.log('=== End Main Component Debug ===')
  }, [selectedStream, setSelectedStream]) // Add setSelectedStream to dependency array

  // Check if all localStorage values have been hydrated
  // Removed isHydrated since hydration flags are no longer returned from useLocalStorage

  // Sync converted content from localStorage whenever the component mounts or step changes
  useEffect(() => {
    if (selectedStream && uploadedFiles.length > 0) {
      syncConvertedContentFromStorage()
    }
  }, [currentStep, selectedStream, uploadedFiles.length]) // Added uploadedFiles.length as dependency

  // Additional effect to ensure sync when entering step 2
  useEffect(() => {
    if (currentStep === 2 && selectedStream && uploadedFiles.length > 0) {
      // Small delay to ensure localStorage is updated
      const timer = setTimeout(() => {
        syncConvertedContentFromStorage()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentStep, selectedStream])

  // Effect to sync uploadedFiles when entering step 3 (especially from history)
  useEffect(() => {
    if (currentStep === 3) {
      console.log('Entering step 3, checking for history data...')
      console.log('Current selectedStream:', selectedStream)
      
      // Ensure selectedStream is loaded from localStorage if not already set
      if (!selectedStream) {
        console.log('selectedStream is null, attempting to load from localStorage...')
        const storedStream = localStorage.getItem('selectedStream')
        if (storedStream) {
          try {
            const parsedStream = JSON.parse(storedStream)
            console.log('Loaded selectedStream from localStorage:', parsedStream)
            setSelectedStream(parsedStream)
          } catch (error) {
            console.error('Error parsing selectedStream from localStorage:', error)
          }
        }
      }
      
      // Check if we're using history data
      const usingHistoryData = localStorage.getItem('usingHistoryData')
      if (usingHistoryData === 'true') {
        console.log('Loading files from localStorage for history data...')
        
        try {
          const storedFiles = localStorage.getItem('uploadedFiles')
          if (storedFiles) {
            const parsedFiles = JSON.parse(storedFiles)
            console.log('Parsed files from localStorage:', parsedFiles)
            setUploadedFiles(parsedFiles)
          }
        } catch (error) {
          console.error('Error loading files from localStorage:', error)
        }
        
        // Clear the flag
        localStorage.removeItem('usingHistoryData')
      }
    }
  }, [currentStep])

  const handleStreamSelected = (stream: StreamType) => {
    setSelectedStream(stream)
    setCurrentStep(1)
    localStorage.setItem('selectedStream', stream)
    localStorage.setItem('currentStep', '1')
  }

  const handleBackToStreamSelection = () => {
    setSelectedStream(null)
    setCurrentStep(0)
    localStorage.setItem('selectedStream', '')
    localStorage.setItem('currentStep', '0')
    localStorage.removeItem('uploadedFiles')
  }

  const handleFilesUploaded = (files: UploadedFile[]) => {
    // Simply update with the new files array
    // The file upload component already handles merging correctly
    setUploadedFiles(files)
  }

  const handleConvertToMD = () => {
    // The conversion and review are now done in the same step
    // This function is called when user confirms files are ready for test case generation
    syncConvertedContentFromStorage()
    setCurrentStep(3) // Go directly to generate step
    localStorage.setItem('currentStep', '3')
  }

  // Function to update uploaded files with converted content
  const updateFilesWithConvertedContent = (updatedFiles: UploadedFile[]) => {
    setUploadedFiles(updatedFiles)
    // Also persist to localStorage for cross-step data sharing
    localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles))
  }

  // Function to sync converted content from conversion step's localStorage
  const syncConvertedContentFromStorage = () => {
    if (!selectedStream) return

    try {
      const storageKey = `conversion-data-${selectedStream}`
      const storedData = localStorage.getItem(storageKey)
      
      if (storedData) {
        const data: ConversionData = JSON.parse(storedData)
        if (data.statuses && data.statuses.length > 0) {
          // Update uploadedFiles with converted content from conversion step
          let hasChanges = false
          const updatedFiles = uploadedFiles.map(file => {
            const conversionStatus = data.statuses.find((status: ConversionStatus) => status.fileId === file.id)
            if (conversionStatus && conversionStatus.status === 'completed' && conversionStatus.markdownResult) {
              if (file.convertedContent !== conversionStatus.markdownResult) {
                hasChanges = true
                return {
                  ...file,
                  convertedContent: conversionStatus.markdownResult
                }
              }
            }
            return file
          })
          
          // Only update state if there are actual changes
          if (hasChanges) {
            console.log('Syncing converted content from localStorage:', updatedFiles.filter(f => f.convertedContent).length, 'files')
            updateFilesWithConvertedContent(updatedFiles)
          }
        }
      }
    } catch (error) {
      console.error('Error syncing converted content:', error)
    }
  }

  const handleConfirmFiles = () => {
    setCurrentStep(3) // This should now go to generate step
    localStorage.setItem('currentStep', '3')
  }

  const handleRegenerateFile = async (fileId: string) => {
    if (!selectedStream) return
    
    setIsConverting(true)
    
    try {
      // Find the file to regenerate
      const fileToRegenerate = uploadedFiles.find(f => f.id === fileId)
      if (!fileToRegenerate) {
        console.error('File not found for regeneration:', fileId)
        return
      }

      // Update conversion status to show it's regenerating
      const storageKey = `conversion-data-${selectedStream}`
      const storedData = localStorage.getItem(storageKey)
      let conversionData: ConversionData = { statuses: [], currentIndex: 0 }
      
      if (storedData) {
        conversionData = JSON.parse(storedData)
      }

      // Update status to converting
      conversionData.statuses = conversionData.statuses.map((status: ConversionStatus) =>
        status.fileId === fileId 
          ? { ...status, status: "converting", error: undefined }
          : status
      )
      localStorage.setItem(storageKey, JSON.stringify(conversionData))

      // Call the conversion API
      const response = await fetch("http://localhost:5678/webhook/html-to-md", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: fileToRegenerate.content,
          fileName: fileToRegenerate.name,
          fileType: fileToRegenerate.type,
          stream: selectedStream,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      let markdownContent = "Regeneration completed"
      
      if (result.status === "success" && result.files && result.files.length > 0) {
        const base64Data = result.files[0].data
        if (base64Data) {
          try {
            // Decode base64 to UTF-8
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            markdownContent = new TextDecoder('utf-8').decode(bytes)
          } catch (decodeError) {
            console.error("Base64 decode error:", decodeError)
            markdownContent = base64Data
          }
        }
      }

      // Update conversion status with new result
      conversionData.statuses = conversionData.statuses.map((status: ConversionStatus) =>
        status.fileId === fileId 
          ? { ...status, status: "completed", markdownResult: markdownContent, error: undefined }
          : status
      )
      localStorage.setItem(storageKey, JSON.stringify(conversionData))

      // Update the uploadedFiles with the new converted content
      const updatedFiles = uploadedFiles.map((file) =>
        file.id === fileId
          ? { ...file, convertedContent: markdownContent }
          : file,
      )
      setUploadedFiles(updatedFiles)

    } catch (error) {
      console.error("Regeneration failed:", error)
      
      // Update status to error
      const storageKey = `conversion-data-${selectedStream}`
      const storedData = localStorage.getItem(storageKey)
      if (storedData) {
        const conversionData: ConversionData = JSON.parse(storedData)
        conversionData.statuses = conversionData.statuses.map((status: ConversionStatus) =>
          status.fileId === fileId 
            ? { ...status, status: "error", error: error instanceof Error ? error.message : "Unknown error" }
            : status
        )
        localStorage.setItem(storageKey, JSON.stringify(conversionData))
      }
    } finally {
      setIsConverting(false)
    }
  }

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== fileId)
    setUploadedFiles(updatedFiles)
    
    // Clean up conversion statuses from localStorage
    if (selectedStream) {
      const storageKey = `conversion-data-${selectedStream}`
      try {
        const storedData = localStorage.getItem(storageKey)
        if (storedData) {
          const data: ConversionData = JSON.parse(storedData)
          if (data.statuses) {
            data.statuses = data.statuses.filter((status: ConversionStatus) => status.fileId !== fileId)
            localStorage.setItem(storageKey, JSON.stringify(data))
          }
        }
      } catch (error) {
        console.error('Error cleaning up conversion data:', error)
      }
    }
  }

  const handleGenerateTestCases = async () => {
    setIsGenerating(true)
    console.log(`Generating ${selectedStream} test cases...`)
    // Simulate test case generation
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsGenerating(false)
  }

  const handleHistoryItemSelected = (item: HistoryItem) => {
    setSelectedHistoryItem(item)
  }

    const handleUseHistoryForGeneration = (items: HistoryItem[], generationType: StreamType) => {
    if (items.length === 0) return
    
    console.log(`Using history items for ${generationType} test generation:`, items)
    
    try {
      // Convert history items to uploadedFiles format
      const filesFromHistory: UploadedFile[] = items.map(item => ({
        id: item.id,
        name: item.fileName,
        type: item.type as FileType || "validation",
        content: item.content,
        convertedContent: item.content // Use content directly since it's already in Markdown
      }))
      
      // Set the selected stream and uploaded files
      setSelectedStream(generationType)
      setUploadedFiles(filesFromHistory)
      
      // Set flag so the step 3 effect knows to reload files
      localStorage.setItem('usingHistoryData', 'true')
      localStorage.setItem('selectedStream', generationType)
      localStorage.setItem('uploadedFiles', JSON.stringify(filesFromHistory))
      
      // Move to the generation step
      setCurrentStep(3)
      localStorage.setItem('currentStep', '3')
      
      // Show a notification
      console.log(`${filesFromHistory.length} file(s) loaded for ${generationType === "validation" ? "Technical Validation" : "Business Validation"} test generation`)
    } catch (error) {
      console.error('Error using history items:', error)
    }
  }

    const handleGenerateFromHistory = async (items: HistoryItem[], generationType: StreamType) => {
    console.log(`Generate ${generationType} test cases from history:`, items)
    
    // Check if we have the required files for business flow
    if (generationType === "business") {
      const hasBusinessDoc = items.some(item => item.type === "business");
      const hasDetailApi = items.some(item => item.type === "detail-api");
      
      if (!hasBusinessDoc || !hasDetailApi) {
        console.error("Business test generation requires at least one Business Document and one Detail API file.");
        return;
      }
    }
    
    // Here you would call the API to generate test cases from history items
    // based on the selected generation type
    
    // For now, we simulate a successful generation
    console.log(`Successfully generated ${generationType} test cases for ${items.length} file(s)`);
  }

  const steps = [
    { number: 0, title: "Select Stream", description: "Choose test case type" },
    { number: 1, title: "Upload Files", description: "Upload HTML documents" },
    { number: 2, title: "Convert & Review", description: "Convert to Markdown and review" },
    { number: 3, title: "Generate", description: "Generate test cases" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* History Sidebar */}
        <div className={`transition-all duration-300 ${isHistoryOpen ? 'w-80' : 'w-12'} border-r bg-background flex flex-col`}>
          <div className="p-4 border-b flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full justify-start"
            >
              {isHistoryOpen ? <ChevronLeft className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4" />}
              {isHistoryOpen && "Hide History"}
            </Button>
          </div>
          {isHistoryOpen && (
            <div className="flex-1 overflow-hidden">
              <HistoryPanel 
                onSelectHistoryItem={handleHistoryItemSelected} 
                onUseForGeneration={handleUseHistoryForGeneration}
                onGenerateFromHistory={handleGenerateFromHistory}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Test Case Generator</h1>
                <p className="text-muted-foreground">
                  Choose your test case stream and convert HTML documents to generate comprehensive test cases
                </p>
              </header>

              {/* Hydration check removed: always render main content */}
              <ProgressIndicator steps={steps} currentStep={currentStep} />

              <div className="mt-8">
                {currentStep === 0 && (
                  <StreamSelectionStep onStreamSelected={handleStreamSelected} selectedStream={selectedStream} />
                )}

                {currentStep === 1 && (
                  <FileUploadStep
                    onFilesUploaded={handleFilesUploaded}
                    onNext={() => setCurrentStep(2)}
                    onBack={handleBackToStreamSelection}
                    uploadedFiles={uploadedFiles}
                    selectedStream={selectedStream}
                    onDeleteFile={handleDeleteFile}
                  />
                )}

                {currentStep === 2 && (
                  <ConversionReviewStep
                    uploadedFiles={uploadedFiles}
                    isConverting={isConverting}
                    setIsConverting={setIsConverting}
                    onConvert={handleConvertToMD}
                    onBack={() => {
                      setCurrentStep(1)
                      localStorage.setItem('currentStep', '1')
                    }}
                    selectedStream={selectedStream}
                    onDeleteFile={handleDeleteFile}
                    onRegenerate={handleRegenerateFile}
                    onUpdateFiles={updateFilesWithConvertedContent}
                    onNavigateToStep={(step: number) => {
                      setCurrentStep(step)
                      localStorage.setItem('currentStep', step.toString())
                    }}
                  />
                )}

                {currentStep === 3 && (
                  <GenerationStep
                    uploadedFiles={uploadedFiles}
                    selectedStream={selectedStream}
                    isGenerating={isGenerating}
                    onGenerateTestCases={handleGenerateTestCases}
                    onBack={() => {
                      setCurrentStep(2)
                      localStorage.setItem('currentStep', '2')
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
