"use client"

import { useState, useEffect } from "react"
import { FileUploadStep } from "@/components/file-upload-step"
import { ConversionReviewStep } from "@/components/conversion-review-step"
import { GenerationStep } from "@/components/generation-step"
import { ProgressIndicator } from "@/components/progress-indicator"
import { StreamSelectionStep } from "@/components/stream-selection-step"
import { HistoryPanel, type HistoryItem } from "@/components/history-panel"
import { DevModeToggle } from "@/components/dev-mode-toggle"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { isDevMode, generateMockMarkdownContent, simulateAsyncOperation } from "@/lib/dev-mode"
import { getHtmlToMdEndpoints, createHtmlConversionOptions } from "@/lib/api-config"
export type FileType = "business" | "detail-api" | "api-integration" | "validation" | "uml-image" | "error"
export type StreamType = "business" | "validation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export interface UploadedFile {
  id: string
  name: string
  type: FileType
  content: string
  convertedContent?: string
  umlContent?: string
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
  const [isHydrated, setIsHydrated] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null)

  // Hydration effect to ensure client-side data is loaded
  useEffect(() => {
    setIsHydrated(true)

    // Force sync with localStorage on mount
    if (typeof window !== 'undefined') {
      console.log('=== Hydration Debug ===')
      const storedStream = localStorage.getItem('selectedStream')
      const storedStep = localStorage.getItem('currentStep')
      console.log('Raw localStorage - selectedStream:', storedStream)
      console.log('Raw localStorage - currentStep:', storedStep)

      // Force update selectedStream if it exists in localStorage but not in state
      if (storedStream && storedStream !== 'null' && storedStream !== '""' && storedStream !== 'undefined') {
        try {
          const parsedStream = JSON.parse(storedStream) as StreamType
          console.log('Parsed selectedStream from localStorage:', parsedStream)
          if (!selectedStream || selectedStream !== parsedStream) {
            console.log('Updating selectedStream from localStorage:', parsedStream)
            setSelectedStream(parsedStream)
          }
        } catch (error) {
          console.error('Error parsing selectedStream from localStorage:', error)
        }
      }

      // Force update currentStep if it exists in localStorage but not in state
      if (storedStep && storedStep !== 'null') {
        try {
          const parsedStep = parseInt(storedStep)
          console.log('Parsed currentStep from localStorage:', parsedStep)
          if (currentStep !== parsedStep) {
            console.log('Updating currentStep from localStorage:', parsedStep)
            setCurrentStep(parsedStep)
          }
        } catch (error) {
          console.error('Error parsing currentStep from localStorage:', error)
        }
      }

      console.log('=== End Hydration Debug ===')
    }
  }, []) // Run only once on mount

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
    console.log('handleStreamSelected - setting stream:', stream)
    setSelectedStream(stream)
    setCurrentStep(1)
    // Persist to localStorage immediately
    localStorage.setItem('selectedStream', JSON.stringify(stream))
    localStorage.setItem('currentStep', '1')
    console.log('handleStreamSelected - persisted to localStorage:', localStorage.getItem('selectedStream'))
  }

  const handleBackToStreamSelection = () => {
    setSelectedStream(null)
    setCurrentStep(0)
    localStorage.removeItem('selectedStream')
    localStorage.setItem('currentStep', '0')
    localStorage.removeItem('uploadedFiles')
  }

  const handleGenerateNewTestCase = () => {
    // Reset all state to initial values
    setSelectedStream(null)
    setCurrentStep(0)
    setUploadedFiles([])
    setIsConverting(false)
    setIsGenerating(false)
    setSelectedHistoryItem(null)

    // Clear all localStorage data
    localStorage.removeItem('selectedStream')
    localStorage.removeItem('currentStep')
    localStorage.removeItem('uploadedFiles')
    localStorage.removeItem('usingHistoryData')
    localStorage.setItem('currentStep', '0')

    // Show success message
    toast.success("Sẵn sàng tạo test cases mới!")
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
        toast.error('File not found for regeneration')
        return
      }

      // Validate file content
      if (!fileToRegenerate.content || fileToRegenerate.content.trim() === '') {
        console.error('File content is empty:', fileToRegenerate.name)
        toast.error('Cannot regenerate: File content is empty')
        return
      }

      // Validate selected stream
      if (!selectedStream) {
        console.error('No stream selected for regeneration')
        toast.error('Cannot regenerate: No stream selected')
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

      let markdownContent = "Regeneration completed"

      if (isDevMode()) {
        // Simulate API call delay in dev mode
        console.log(`🚀 Dev Mode: Mocking regeneration for ${fileToRegenerate.name}`)
        await simulateAsyncOperation(1200) // Slightly longer for regeneration
        markdownContent = generateMockMarkdownContent(
          fileToRegenerate.name,
          fileToRegenerate.type,
          selectedStream
        ) + `\n\n---\n*Regenerated at ${new Date().toLocaleTimeString()}*`
      } else {
        // Real API call
        // Real API call with fallback endpoints
        const endpoints = getHtmlToMdEndpoints()

        let response
        let lastError

        for (const endpoint of endpoints) {
          try {
            console.log('Making API request to:', endpoint)
            console.log('Request payload:', {
              fileName: fileToRegenerate.name,
              fileType: fileToRegenerate.type,
              stream: selectedStream,
              contentLength: fileToRegenerate.content?.length
            })

            const fetchOptions = createHtmlConversionOptions({
              method: "POST",
              body: JSON.stringify({
                content: fileToRegenerate.content,
                fileName: fileToRegenerate.name,
                fileType: fileToRegenerate.type,
                stream: selectedStream,
              }),
            })

            response = await fetch(endpoint, fetchOptions)

            console.log('Response status:', response.status)
            console.log('Response headers:', Object.fromEntries(response.headers.entries()))

            if (response.ok) {
              break // Success, exit the loop
            } else {
              const errorText = await response.text()
              console.error(`API Error Response from ${endpoint}:`, errorText)
              lastError = new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
            }
          } catch (error) {
            console.error(`Error with endpoint ${endpoint}:`, error)
            lastError = error
            continue // Try next endpoint
          }
        }

        if (!response || !response.ok) {
          throw lastError || new Error('All API endpoints failed')
        }

        let result
        try {
          result = await response.json()
          console.log('API Response:', result)
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError)
          const responseText = await response.text()
          console.error('Raw response:', responseText)
          throw new Error(`Invalid JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`)
        }

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

              // Validate that we got actual content
              if (!markdownContent || markdownContent.trim() === '') {
                console.warn('API returned empty content, using fallback')
                markdownContent = generateMockMarkdownContent(
                  fileToRegenerate.name,
                  fileToRegenerate.type,
                  selectedStream
                ) + `\n\n---\n*API returned empty content - using fallback at ${new Date().toLocaleTimeString()}*`
              }
            } catch (decodeError) {
              console.error("Base64 decode error:", decodeError)
              // If base64 decode fails, try using the raw data
              markdownContent = base64Data
            }
          } else {
            console.warn('API response missing data field, using fallback')
            markdownContent = generateMockMarkdownContent(
              fileToRegenerate.name,
              fileToRegenerate.type,
              selectedStream
            ) + `\n\n---\n*API response missing data - using fallback at ${new Date().toLocaleTimeString()}*`
          }
        } else {
          console.warn('API response not successful or missing files, using fallback')
          console.log('Result status:', result?.status)
          console.log('Result files:', result?.files)
          markdownContent = generateMockMarkdownContent(
            fileToRegenerate.name,
            fileToRegenerate.type,
            selectedStream
          ) + `\n\n---\n*API response not successful - using fallback at ${new Date().toLocaleTimeString()}*`
        }
      }

      // Show success message to user
      toast.success(`Tài liệu "${fileToRegenerate.name}" đã được tạo lại thành công`)

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

      let errorMessage = "Unknown error"
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout - please try again"
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error - check your connection"
        } else {
          errorMessage = error.message
        }
      }

      // Show user-friendly error message
      toast.error(`Tạo lại thất bại: ${errorMessage}`)

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
    { number: 0, title: "Chọn Luồng", description: "Chọn loại test case" },
    { number: 1, title: "Tải Tài Liệu", description: "Tải lên tài liệu HTML" },
    { number: 2, title: "Chuyển Đổi & Duyệt", description: "Chuyển đổi sang Markdown và duyệt" },
    { number: 3, title: "Tạo Test Case", description: "Tạo test cases" },
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
              {isHistoryOpen && "Ẩn Lịch Sử"}
            </Button>
          </div>
          {isHistoryOpen && (
            <div className="flex-1 overflow-hidden">
              <HistoryPanel
                onSelectHistoryItem={handleHistoryItemSelected}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1"></div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Trình Tạo Test Case</h1>
                    <p className="text-muted-foreground">
                      Chọn luồng test case và chuyển đổi tài liệu HTML để tạo test cases toàn diện
                    </p>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Hướng Dẫn</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Cách sử dụng trang này</DialogTitle>
                        </DialogHeader>

                        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                          <ol className="list-decimal pl-5 space-y-2">
                            <li><strong>Chọn Luồng</strong>: Chọn loại test case (Kịch bản nghiệp vụ / Kiểm thử kỹ thuật).</li>
                            <li><strong>Tải Tài Liệu</strong>: Tải lên các tài liệu HTML có thiết kế chi tiết.</li>
                            <li><strong>Chuyển Đổi & Duyệt</strong>: Chuyển đổi sang Markdown, xem lại và tái tạo khi cần.</li>
                            <li><strong>Tạo Test Case</strong>: Tạo test cases dựa trên nội dung đã duyệt.</li>
                          </ol>

                          <h4 className="font-semibold mt-4">Mẹo Sử Dụng</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Có thể mở panel Lịch Sử để tái sử dụng tài liệu cũ.</li>
                            <li>Chế độ Dev hỗ trợ mock nội dung khi chưa gọi API thực.</li>
                            <li>Dữ liệu bước/luồng được lưu trong <code>localStorage</code> để tiếp tục sau.</li>
                          </ul>
                        </div>

                        <div className="flex justify-end">
                          <DialogClose asChild>
                            <Button type="button" variant="default">
                              Đã Hiểu
                            </Button>
                          </DialogClose>
                        </div>

                      </DialogContent>
                    </Dialog>
                    <DevModeToggle />
                  </div>
                </div>
              </header>

              {/* Show loading state until hydrated */}
              {!isHydrated ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Đang tải...</p>
                </div>
              ) : (
                <>
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
                        onGenerateNew={handleGenerateNewTestCase}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
