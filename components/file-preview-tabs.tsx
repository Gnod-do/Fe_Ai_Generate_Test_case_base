"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Maximize2 } from "lucide-react"
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

interface FilePreviewTabsProps {
  selectedFileData: UploadedFile
  getConvertedContent: (fileId: string) => string
  onRegenerate: (fileId: string) => void
  onFullscreen: () => void
  isConverting: boolean
}

export function FilePreviewTabs({
  selectedFileData,
  getConvertedContent,
  onRegenerate,
  onFullscreen,
  isConverting
}: FilePreviewTabsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-semibold truncate pr-4" title={selectedFileData.name}>
          {selectedFileData.name}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFullscreen}
            className="flex-shrink-0"
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            Fullscreen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(selectedFileData.id)}
            disabled={isConverting}
            className="flex-shrink-0"
          >
            {isConverting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="preview" className="text-base">Preview Markdown</TabsTrigger>
          <TabsTrigger value="converted" className="text-base">Raw Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <div className="h-[600px] w-full border rounded-lg bg-background shadow-sm overflow-auto">
            <div className="p-6 max-w-none">
              <div 
                className="markdown-content prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{    
                  __html: convertMarkdownToHTML(getConvertedContent(selectedFileData.id))
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="converted" className="mt-6">
          <div className="h-[600px] w-full border rounded-lg bg-muted/10 overflow-x-auto overflow-y-auto scroll-container">
            <div className="p-6">
              <pre className="text-sm whitespace-pre font-mono leading-relaxed text-muted-foreground min-w-max" style={{ minWidth: '800px' }}>
                {getConvertedContent(selectedFileData.id)}
              </pre>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}