import type { NextRequest } from "next/server"
import { generateTimelineSvg } from "@/lib/timeline-svg"

// GitHub token from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

interface Repository {
  name: string
  created_at: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  topics: string[]
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  if (!username) {
    return new Response("Username is required", { status: 400 })
  }

  try {
    // Prepare headers for GitHub API request
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RetroRepo-Timeline-Generator",
    }

    // Add authorization header if token is available
    if (GITHUB_TOKEN) {
      headers["Authorization"] = `token ${GITHUB_TOKEN}`
    }

    // Fetch repositories from GitHub API
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=created&per_page=100`, {
      headers,
    })

    if (!response.ok) {
      return new Response("Failed to fetch GitHub repositories", { status: response.status })
    }

    const repos: Repository[] = await response.json()

    if (repos.length === 0) {
      return new Response("No public repositories found for this user", { status: 404 })
    }

    // Sort repositories by creation date
    const sortedRepos = repos.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Generate SVG timeline
    const svgContent = generateTimelineSvg(sortedRepos, username)

    // Return SVG with proper headers
    return new Response(svgContent, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("Error generating timeline:", error)
    return new Response("Error generating timeline", { status: 500 })
  }
}
