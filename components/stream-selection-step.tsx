"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileCheck, Shield, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StreamType } from "@/app/page"

interface StreamSelectionStepProps {
  onStreamSelected: (stream: StreamType) => void
  selectedStream: StreamType | null
}

const streamOptions = [
  {
    type: "business" as StreamType,
    title: "Business Test Cases",
    description: "Generate comprehensive business test cases from business documents, API details, and integration specs",
    icon: FileCheck,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    badgeColor: "bg-blue-100 text-blue-800",
    features: ["Business document analysis", "API detail testing", "Integration testing", "Multi-document workflow"],
    requirements: {
      files: "1-3 files required",
      types: [
        { name: "📋 Business Requirements", required: true, description: "Main specification document" },
        { name: "🔧 Technical Specifications", required: true, description: "API documentation and endpoints" },
        { name: "🔗 Integration Guides", required: false, description: "System integration docs (optional, multiple allowed)" }
      ]
    },
    workflow: "Multi-document → Convert → Generate business test cases",
    idealFor: "Complex business applications with multiple APIs and integrations"
  },
  {
    type: "validation" as StreamType,
    title: "Validation Test Cases",
    description: "Generate validation test cases from a single document for data validation and input verification",
    icon: Shield,
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    badgeColor: "bg-green-100 text-green-800",
    features: ["Single file validation", "Input verification", "Data integrity checks", "Quick validation testing"],
    requirements: {
      files: "1 file only",
      types: [
        { name: "✅ Validation Document", required: true, description: "Any document for validation testing" }
      ]
    },
    workflow: "Single document → Convert → Generate validation test cases",
    idealFor: "Simple validation scenarios and input verification testing"
  },
]

export function StreamSelectionStep({ onStreamSelected, selectedStream }: StreamSelectionStepProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Select Test Case Stream</CardTitle>
        <CardDescription>Choose the type of test cases you want to generate from your HTML documents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {streamOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedStream === option.type

            return (
              <div
                key={option.type}
                className={cn(
                  "relative border-2 rounded-lg p-6 cursor-pointer transition-all",
                  option.color,
                  isSelected && "ring-2 ring-primary ring-offset-2",
                )}
                onClick={() => onStreamSelected(option.type)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{option.title}</h3>
                      <Badge variant="secondary" className={option.badgeColor}>
                        {option.type.charAt(0).toUpperCase() + option.type.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{option.description}</p>
                    
                    {/* File Requirements */}
                    <div className="bg-white/50 rounded-md p-3 space-y-2">
                      <div className="text-xs font-medium text-gray-700">File Requirements:</div>
                      <div className="text-xs text-blue-600 font-medium">{option.requirements.files}</div>
                      <div className="space-y-1">
                        {option.requirements.types.map((fileType, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-center">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0" />
                            <span className="font-medium">{fileType.name}</span>
                            {fileType.required && <span className="text-red-500 ml-1">*</span>}
                            <span className="ml-2 text-gray-500">- {fileType.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Workflow */}
                    <div className="bg-gray-50 rounded-md p-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Workflow:</div>
                      <div className="text-xs text-gray-600">{option.workflow}</div>
                    </div>
                    
                    {/* Ideal For */}
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Best for:</span> {option.idealFor}
                    </div>
                    
                    <ul className="space-y-1">
                      {option.features.map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <ArrowRight className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {selectedStream && (
          <div className="flex justify-center pt-4">
            <Button onClick={() => onStreamSelected(selectedStream)} className="min-w-40">
              Continue with {selectedStream.charAt(0).toUpperCase() + selectedStream.slice(1)} Stream
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
