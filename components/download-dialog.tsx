"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, FileText, FileSpreadsheet } from "lucide-react"

interface DownloadDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (filename: string) => void
  defaultFilename: string
  fileSize?: string
  streamType?: string | null
  isMultiple?: boolean
}

export function DownloadDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  defaultFilename, 
  fileSize = "Unknown",
  streamType,
  isMultiple = false
}: DownloadDialogProps) {
  const [filename, setFilename] = useState(defaultFilename)

  // Reset filename when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename)
    }
  }, [isOpen, defaultFilename])

  const handleConfirm = () => {
    const finalFilename = filename.trim()
    if (!finalFilename) {
      onConfirm(defaultFilename)
    } else {
      // Ensure .xlsx extension instead of .csv
      const nameWithoutExt = finalFilename.replace(/\.(csv|xlsx)$/i, '')
      onConfirm(`${nameWithoutExt}.xlsx`)
    }
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-primary" />
            <span>Download Test Cases</span>
          </DialogTitle>
          <DialogDescription>
            Your {streamType === "business" ? "business validation" : "technical validation"} test cases are ready to download.
            {isMultiple ? " All completed test cases will be combined into a single Excel file." : ""} Choose a filename for your Excel file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{isMultiple ? "Combined " : ""}Test Cases Excel</p>
              <p className="text-xs text-muted-foreground">
                {isMultiple ? "Combined test cases from all files" : 
                  streamType === "business" ? "Business flow test scenarios" : "Technical validation test cases"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {fileSize}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter filename..."
              autoFocus
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The .xlsx extension will be added automatically
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} className="sm:ml-3">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}