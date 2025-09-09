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
    description: "Generate test cases focused on business logic, user workflows, and functional requirements",
    icon: FileCheck,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    badgeColor: "bg-blue-100 text-blue-800",
    features: ["User story validation", "Business rule testing", "Workflow verification", "Functional requirements"],
  },
  {
    type: "validation" as StreamType,
    title: "Validation Test Cases",
    description: "Generate test cases focused on data validation, input verification, and error handling",
    icon: Shield,
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    badgeColor: "bg-green-100 text-green-800",
    features: ["Input validation", "Data integrity checks", "Error handling", "Boundary testing"],
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
