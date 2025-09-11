"use client"

import { useState, useRef, useCallback } from "react"
import type { UploadedFile, StreamType } from "@/app/page"
import { isDevMode, generateMockMarkdownContent, simulateAsyncOperation } from "@/lib/dev-mode"

interface ConversionStatus {
  fileId: string
  status: "pending" | "converting" | "completed" | "error"
  error?: string
  markdownResult?: string
}

export function useConversionLogic(
  uploadedFiles: UploadedFile[],
  selectedStream: StreamType | null,
  setIsConverting: (value: boolean) => void,
  onUpdateFiles: (files: UploadedFile[]) => void
) {
  const [conversionStatuses, setConversionStatuses] = useState<ConversionStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCancelledRef = useRef(false)

  const handleCancelConversion = useCallback(() => {
    isCancelledRef.current = true
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setIsConverting(false)
    
    const currentFile = uploadedFiles[currentFileIndex]
    if (currentFile) {
      setConversionStatuses(prev => 
        prev.map(status => 
          status.fileId === currentFile.id 
            ? { ...status, status: "pending" as const, error: undefined } 
            : status
        )
      )
    }
  }, [currentFileIndex, uploadedFiles, setIsConverting])

  const handleConvertAllFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) return

    setIsConverting(true)
    isCancelledRef.current = false
    
    setConversionStatuses(prev => 
      prev.map(status => ({ 
        ...status, 
        status: "pending" as const, 
        error: undefined 
      }))
    )

    for (let i = 0; i < uploadedFiles.length; i++) {
      if (isCancelledRef.current) break
      
      const file = uploadedFiles[i]
      setCurrentFileIndex(i)
      
      setConversionStatuses(prev => 
        prev.map(status => 
          status.fileId === file.id 
            ? { ...status, status: "converting" } 
            : status
        )
      )

      try {
        abortControllerRef.current = new AbortController()

        let markdownContent = "Conversion completed"

        if (isDevMode()) {
          // Simulate API call delay in dev mode
          console.log(`🚀 Dev Mode: Mocking conversion for ${file.name}`)
          await simulateAsyncOperation(800) // Shorter delay for better UX
          markdownContent = generateMockMarkdownContent(file.name, file.type, selectedStream || 'unknown')
        } else {
          // Real API call
          const response = await fetch("https://testcase-gen.app.n8n.cloud/webhook/html-to-md", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: file.content,
              fileName: file.name,
              fileType: file.type,
              stream: selectedStream,
            }),
            signal: abortControllerRef.current.signal,
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const result = await response.json()
          
          if (result.status === "success" && result.files && result.files.length > 0) {
            const base64Data = result.files[0].data
            if (base64Data) {
              try {
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
            } else {
              markdownContent = "No content received"
            }
          } else {
            markdownContent = generateMockMarkdownContent(file.name, file.type, selectedStream || 'unknown')
          }
        }

        if (isCancelledRef.current) break

        setConversionStatuses((prev) => {
          const updatedStatuses = prev.map((status) =>
            status.fileId === file.id
              ? {
                  ...status,
                  status: "completed" as const,
                  markdownResult: markdownContent,
                }
              : status
          )
          localStorage.setItem(`conversion-statuses-${selectedStream}`, JSON.stringify(updatedStatuses))
          return updatedStatuses
        })

        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error("Conversion failed for:", file.name, error)

        if (error instanceof Error && error.name === 'AbortError') {
          console.log("Conversion was cancelled")
          break
        }

        setConversionStatuses((prev) =>
          prev.map((status) =>
            status.fileId === file.id
              ? { ...status, status: "error", error: error instanceof Error ? error.message : "Unknown error" }
              : status,
          ),
        )
      }
    }

    setIsConverting(false)
    abortControllerRef.current = null
    isCancelledRef.current = false
    
    setTimeout(() => {
      const updatedFiles = uploadedFiles.map(file => {
        const conversionStatus = conversionStatuses.find(s => s.fileId === file.id)
        if (conversionStatus && conversionStatus.status === "completed" && conversionStatus.markdownResult) {
          return {
            ...file,
            convertedContent: conversionStatus.markdownResult
          }
        }
        return file
      })
      
      onUpdateFiles(updatedFiles)
    }, 100)
  }, [uploadedFiles, selectedStream, setIsConverting, conversionStatuses, onUpdateFiles])

  return {
    conversionStatuses,
    setConversionStatuses,
    currentFileIndex,
    setCurrentFileIndex,
    handleCancelConversion,
    handleConvertAllFiles,
    abortControllerRef
  }
}