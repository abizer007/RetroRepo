"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Copy, Check, Github, Clock, Star, Code, GitBranch, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ThemeToggle from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FunFact } from "@/components/fun-fact"
import { CreatorInfo } from "@/components/creator-info"

interface UserStats {
  repoCount: number
  totalStars: number
  topLanguage: string
  oldestRepo: string
  newestRepo: string
  yearSpan: number
}

export default function Home() {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [origin, setOrigin] = useState("")
  const [embedType, setEmbedType] = useState<"html" | "markdown">("markdown")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    setSvgContent(null)
    setUserStats(null)
    setError(null)

    try {
      const response = await fetch(`/api/generate/${username}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate timeline" }))
        throw new Error(errorData.message || "Failed to generate timeline")
      }

      const data = await response.json()
      setSvgContent(data.svgContent)
      setUserStats(data.userStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const htmlEmbedCode = svgContent
    ? `<img src="${origin}/api/svg/${username}" alt="${username}'s GitHub Timeline" width="900" />`
    : ""

  const markdownEmbedCode = svgContent
    ? `[![${username}'s GitHub Timeline](${origin}/api/svg/${username})](${origin})`
    : ""

  const embedCode = embedType === "html" ? htmlEmbedCode : markdownEmbedCode

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSvg = async () => {
    if (!username.trim()) return
    try {
      const res = await fetch(`${origin}/api/svg/${username}`)
      if (!res.ok) throw new Error("Failed to download")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${username}-github-timeline.svg`
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: "Downloaded",
        description: "SVG saved to your device",
      })
    } catch {
      toast({
        title: "Download failed",
        description: "Could not save SVG",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 md:py-16 bg-gradient-to-b from-background to-muted/50">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl w-full space-y-14 text-center">
        <div className="space-y-5">
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center gap-2">
            <Clock className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            RetroRepo
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Visualize your GitHub journey — as a timeline you can embed in your README.
          </p>
        </div>

        <Card className="bg-background/80 backdrop-blur-sm border shadow-lg rounded-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-left block">
                  Enter your GitHub username
                </label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="octocat"
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !username.trim()}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Timeline"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <FunFact />

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Fetching GitHub repositories...</p>
          </div>
        )}

        {svgContent && !isLoading && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-xl border shadow-sm">
                  <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Repositories</h3>
                    </div>
                    <p className="text-3xl font-bold">{userStats.repoCount}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Over {userStats.yearSpan} {userStats.yearSpan === 1 ? "year" : "years"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border shadow-sm">
                  <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-medium">Total Stars</h3>
                    </div>
                    <p className="text-3xl font-bold">{userStats.totalStars}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top language: {userStats.topLanguage || "None"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border shadow-sm">
                  <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-5 w-5 text-green-500" />
                      <h3 className="font-medium">Journey</h3>
                    </div>
                    <p className="text-sm">
                      First repo: <span className="font-medium">{userStats.oldestRepo}</span>
                    </p>
                    <p className="text-sm mt-1">
                      Latest repo: <span className="font-medium">{userStats.newestRepo}</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-heading">Your GitHub Timeline</h2>
              <div className="bg-card border rounded-xl p-5 shadow-lg overflow-x-auto ring-1 ring-border/50">
                <div className="min-w-[1000px]">
                  <div className="w-full h-[560px]" dangerouslySetInnerHTML={{ __html: svgContent }} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-heading">Embed in your README</h2>
              <Tabs
                defaultValue="markdown"
                className="w-full"
                onValueChange={(value) => setEmbedType(value as "html" | "markdown")}
              >
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                </TabsList>
                <TabsContent value="markdown" className="mt-4">
                  <div className="bg-card border rounded-xl shadow-md overflow-hidden">
                    <div className="bg-muted p-3 flex justify-between items-center border-b">
                      <span className="text-sm font-medium">Markdown</span>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 gap-1">
                        {copied && embedType === "markdown" ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-4 bg-card overflow-x-auto">
                      <pre className="text-sm text-left whitespace-pre-wrap break-all">{markdownEmbedCode}</pre>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="html" className="mt-4">
                  <div className="bg-card border rounded-xl shadow-md overflow-hidden">
                    <div className="bg-muted p-3 flex justify-between items-center border-b">
                      <span className="text-sm font-medium">HTML</span>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 gap-1">
                        {copied && embedType === "html" ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-4 bg-card overflow-x-auto">
                      <pre className="text-sm text-left whitespace-pre-wrap break-all">{htmlEmbedCode}</pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={downloadSvg}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download SVG
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save the timeline as an SVG file</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/api/svg/${username}`, "_blank")}
                      className="gap-2"
                    >
                      <Github className="h-4 w-4" />
                      View Raw SVG
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open the SVG in a new tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 text-left">
            <h3 className="font-medium">Error</h3>
            <p>{error}</p>
          </div>
        )}

        <div className="pt-8">
          <CreatorInfo />
        </div>
      </div>
    </main>
  )
}
