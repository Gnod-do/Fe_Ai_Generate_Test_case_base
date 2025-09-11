"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Eye, RotateCcw } from "lucide-react"
import { marked } from "marked"
import { cn } from "@/lib/utils"

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

interface ConversionComparisonProps {
  fileName: string
  fileType: string
  originalContent: string
  convertedContent?: string
  onRegenerate?: () => void
  isRegenerating?: boolean
  error?: string
}

function convertMarkdownToHTML(markdown: string): string {
  try {
    return marked(markdown) as string
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return `<p class="text-destructive">Error parsing markdown content</p>`
  }
}

function getFileTypeColor(fileType: string) {
  switch (fileType) {
    case "business":
      return "bg-purple-100 text-purple-800"
    case "detail-api":
      return "bg-blue-100 text-blue-800"
    case "api-integration":
      return "bg-green-100 text-green-800"
    case "validation":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getFileTypeLabel(fileType: string) {
  switch (fileType) {
    case "business":
      return "📋 Business Requirements"
    case "detail-api":
      return "🔧 Technical Specifications"
    case "api-integration":
      return "🔗 Integration Guides"
    case "validation":
      return "✅ Validation Document"
    default:
      return "📄 Document"
  }
}

export function ConversionComparison({
  fileName,
  fileType,
  originalContent,
  convertedContent,
  onRegenerate,
  isRegenerating = false,
  error
}: ConversionComparisonProps) {
  const hasConvertedContent = convertedContent && convertedContent.length > 0
  const truncatedOriginal = originalContent.length > 2000 ? 
    originalContent.substring(0, 2000) + "..." : originalContent

  return (
    <div className="space-y-4">
      {/* File Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">{fileName}</h3>
            <Badge variant="secondary" className={getFileTypeColor(fileType)}>
              {getFileTypeLabel(fileType)}
            </Badge>
          </div>
        </div>
        
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            <RotateCcw className={cn(
              "h-4 w-4",
              isRegenerating && "animate-spin"
            )} />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Conversion Error
          </div>
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-red-500 mt-1">
            Please try regenerating the conversion or check your source document format.
          </p>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
        {/* Original HTML */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <h4 className="font-medium text-sm text-gray-700">📄 Original HTML</h4>
            <Badge variant="outline" className="text-xs">
              {Math.round(originalContent.length / 1024)} KB
            </Badge>
          </div>
          <ScrollArea className="h-80">
            <div className="p-4">
              <pre className="text-xs whitespace-pre-wrap text-gray-600 font-mono leading-relaxed">
                {truncatedOriginal}
              </pre>
              {originalContent.length > 2000 && (
                <div className="mt-2 text-xs text-gray-400 italic">
                  Content truncated for display. Full content will be processed.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Converted Markdown */}
        <div className="border rounded-lg overflow-hidden">
          <div className={cn(
            "px-4 py-2 border-b flex items-center gap-2",
            hasConvertedContent ? "bg-green-100" : "bg-yellow-100"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              hasConvertedContent ? "bg-green-500" : "bg-yellow-500"
            )}></div>
            <h4 className="font-medium text-sm text-gray-700">
              {hasConvertedContent ? "✅ Converted Markdown" : "⏳ Waiting for Conversion"}
            </h4>
            {hasConvertedContent && (
              <Badge variant="outline" className="text-xs">
                {Math.round(convertedContent.length / 1024)} KB
              </Badge>
            )}
          </div>
          <ScrollArea className="h-80">
            {hasConvertedContent ? (
              <div className="p-4">
                <div 
                  className="prose prose-sm max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: convertMarkdownToHTML(convertedContent) 
                  }}
                />
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Conversion in progress...</p>
                    <p className="text-xs">Please wait while we process your document</p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Conversion Statistics */}
      {hasConvertedContent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-blue-800 font-medium">
                {((convertedContent.length / originalContent.length) * 100).toFixed(1)}%
              </div>
              <div className="text-blue-600 text-xs">Conversion Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-blue-800 font-medium">
                {(convertedContent.match(/\n/g) || []).length}
              </div>
              <div className="text-blue-600 text-xs">Lines Generated</div>
            </div>
            <div className="text-center">
              <div className="text-blue-800 font-medium">
                {(convertedContent.match(/#{1,6}/g) || []).length}
              </div>
              <div className="text-blue-600 text-xs">Sections Found</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
