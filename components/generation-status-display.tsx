"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"
import type { StreamType } from "@/app/page"
import { getStreamFromStorage } from "@/lib/stream-utils"

interface GenerationStatusDisplayProps {
  effectiveStream: StreamType | null
}

export function GenerationStatusDisplay({ effectiveStream }: GenerationStatusDisplayProps) {
  const [displayStream, setDisplayStream] = useState<StreamType | null>(effectiveStream)

  useEffect(() => {
    if (effectiveStream) {
      setDisplayStream(effectiveStream)
    } else {
      // Try to get from localStorage if not provided
      const storedStream = getStreamFromStorage()
      setDisplayStream(storedStream)
    }
  }, [effectiveStream])
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Play className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Selected Test Case Type</h3>
              <p className="text-sm text-blue-700">
                {displayStream ? (
                  displayStream === "business" ? "Business Validation Test Cases" : "Technical Validation Test Cases"
                ) : (
                  <span className="text-red-600">⚠️ No stream selected - please go back and select a test case type</span>
                )}
              </p>
            </div>
          </div>
          {displayStream && (
            <Badge variant="default" className="bg-blue-600 text-white">
              {displayStream === "business" ? "Business" : "Validation"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}