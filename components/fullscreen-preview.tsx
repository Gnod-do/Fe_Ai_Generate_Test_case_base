"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Minimize2 } from "lucide-react"
import { marked } from "marked"
import type { UploadedFile } from "@/app/page"

marked.setOptions({
  breaks: true,
  gfm: true,
})

function convertMarkdownToHTML(markdown: string): string {
  try {
    return marked(markdown) as string
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return `<p class="text-destructive">Error parsing markdown content</p>`
  }
}

interface FullscreenPreviewProps {
  selectedFileData: UploadedFile
  fileTypeLabels: Record<string, string>
  getConvertedContent: (fileId: string) => string
  onRegenerate: (fileId: string) => void
  isConverting: boolean
  onClose: () => void
}

export function FullscreenPreview({
  selectedFileData,
  fileTypeLabels,
  getConvertedContent,
  onRegenerate,
  isConverting,
  onClose
}: FullscreenPreviewProps) {
  return (
    <div className="h-full w-full fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold" title={selectedFileData.name}>
              {selectedFileData.name}
            </h2>
            <Badge variant="outline">{fileTypeLabels[selectedFileData.type]}</Badge>
          </div>
          <div className="flex items-center space-x-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden overflow-y-auto overflow-x-auto scroll-container">
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 grid w-fit grid-cols-2 h-12">
              <TabsTrigger value="preview" className="text-base px-6">Preview Markdown</TabsTrigger>
              <TabsTrigger value="converted" className="text-base px-6">Raw Markdown</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 mx-4 mb-4 mt-2">
              <div className="h-full w-full border rounded-lg bg-background shadow-sm overflow-y-auto overflow-x-auto scroll-container">
                <div className="p-8 min-w-0">
                  <div 
                    className="text-base leading-relaxed markdown-content"
                    style={{ minWidth: '1000px', width: 'max-content' }}
                    dangerouslySetInnerHTML={{
                      __html: convertMarkdownToHTML(getConvertedContent(selectedFileData.id))
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="converted" className="flex-1 mx-4 mb-4 mt-2">
              <div className="h-full w-full border rounded-lg bg-muted/10 overflow-y-auto overflow-x-auto scroll-container">
                <div className="p-8">
                  <pre className="text-sm whitespace-pre font-mono leading-relaxed text-muted-foreground" style={{ minWidth: '1000px' }}>
                    {getConvertedContent(selectedFileData.id)}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}