"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Zap } from "lucide-react"
import { isDevMode, toggleDevMode } from "@/lib/dev-mode"

export function DevModeToggle() {
  const [devModeEnabled, setDevModeEnabled] = useState(false)

  useEffect(() => {
    setDevModeEnabled(isDevMode())
  }, [])

  const handleToggle = () => {
    const newState = toggleDevMode()
    setDevModeEnabled(newState)
    
    // Show feedback
    if (newState) {
      console.log("🚀 Development mode enabled - API calls will be mocked")
    } else {
      console.log("📡 Development mode disabled - Real API calls will be made")
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={devModeEnabled ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className={`flex items-center space-x-2 ${
          devModeEnabled 
            ? "bg-orange-600 hover:bg-orange-700 text-white" 
            : "hover:bg-orange-50"
        }`}
      >
        {devModeEnabled ? <Zap className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        <span>{devModeEnabled ? "Dev Mode" : "Production"}</span>
      </Button>
      
      {devModeEnabled && (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Mock APIs
        </Badge>
      )}
    </div>
  )
}