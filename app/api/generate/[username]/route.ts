import { type NextRequest, NextResponse } from "next/server"
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

interface UserStats {
  repoCount: number
  totalStars: number
  topLanguage: string
  oldestRepo: string
  newestRepo: string
  yearSpan: number
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  if (!username) {
    return NextResponse.json({ message: "Username is required" }, { status: 400 })
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
      if (response.status === 404) {
        return NextResponse.json({ message: "GitHub user not found" }, { status: 404 })
      }

      if (response.status === 403) {
        return NextResponse.json(
          { message: "GitHub API rate limit exceeded. Please try again later." },
          { status: 429 },
        )
      }

      return NextResponse.json({ message: "Failed to fetch GitHub repositories" }, { status: response.status })
    }

    const repos: Repository[] = await response.json()

    if (repos.length === 0) {
      return NextResponse.json({ message: "No public repositories found for this user" }, { status: 404 })
    }

    // Sort repositories by creation date
    const sortedRepos = repos.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Calculate user stats
    const userStats = calculateUserStats(sortedRepos)

    // Generate SVG timeline
    const svgContent = generateTimelineSvg(sortedRepos, username)

    return NextResponse.json({ svgContent, userStats })
  } catch (error) {
    console.error("Error generating timeline:", error)
    return NextResponse.json({ message: "Failed to generate timeline" }, { status: 500 })
  }
}

function calculateUserStats(repos: Repository[]): UserStats {
  // Count total stars
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)

  // Find top language
  const languages = repos
    .filter((repo) => repo.language)
    .reduce(
      (acc, repo) => {
        const lang = repo.language as string
        acc[lang] = (acc[lang] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

  const topLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"

  // Calculate year span
  const firstDate = new Date(repos[0].created_at)
  const lastDate = new Date(repos[repos.length - 1].created_at)
  const yearSpan = Math.max(1, lastDate.getFullYear() - firstDate.getFullYear())

  return {
    repoCount: repos.length,
    totalStars,
    topLanguage,
    oldestRepo: repos[0].name,
    newestRepo: repos[repos.length - 1].name,
    yearSpan,
  }
}
