/**
 * Shared timeline SVG generator. Used by both /api/generate/[username] and /api/svg/[username].
 */

export interface TimelineRepo {
  name: string
  created_at: string
  html_url: string
  language: string | null
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C#": "#178600",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  Ruby: "#701516",
  Go: "#00ADD8",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  default: "#6e7781",
}

const MAX_DISPLAY_NAME_LEN = 20
const TRUNCATE_AT = 18
const LABEL_WIDTH = 160
const STACK_STEP = 14

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function generateTimelineSvg(repos: TimelineRepo[], username: string): string {
  // SVG dimensions and settings (tuned for less clutter and more vertical room)
  const width = 900
  const height = 440
  const padding = 60
  const timelineY = height / 2
  const dotRadius = 6
  const labelHeight = 24
  const labelWidth = LABEL_WIDTH
  const labelRadius = 6
  const minLabelSpacing = 162
  const baseOffset = 65
  const stackStep = labelHeight + STACK_STEP

  const firstDate = new Date(repos[0].created_at)
  const lastDate = new Date(repos[repos.length - 1].created_at)
  const timeSpan = lastDate.getTime() - firstDate.getTime()

  const paddingTime = timeSpan * 0.1
  const adjustedFirstDate = new Date(firstDate.getTime() - paddingTime)
  const adjustedLastDate = new Date(lastDate.getTime() + paddingTime)
  const adjustedTimeSpan = adjustedLastDate.getTime() - adjustedFirstDate.getTime()

  const getXPosition = (date: Date) => {
    const timeOffset = date.getTime() - adjustedFirstDate.getTime()
    const ratio = timeOffset / adjustedTimeSpan
    return padding + ratio * (width - 2 * padding)
  }

  let dots = ""
  let labels = ""
  let connections = ""

  const years: string[] = []
  const startYear = adjustedFirstDate.getFullYear()
  const endYear = adjustedLastDate.getFullYear()

  for (let year = startYear; year <= endYear; year++) {
    const yearDate = new Date(year, 0, 1)
    if (yearDate < adjustedFirstDate) continue
    if (yearDate > adjustedLastDate) break

    const x = getXPosition(yearDate)
    years.push(`
      <line x1="${x}" y1="${timelineY - 15}" x2="${x}" y2="${timelineY + 15}" stroke="var(--color-timeline)" stroke-width="1" stroke-dasharray="4" />
      <text x="${x}" y="${timelineY + 35}" text-anchor="middle" font-size="12" fill="var(--color-text-light)">${year}</text>
    `)
  }

  const repoGroups: TimelineRepo[][] = []
  const reposToProcess = [...repos]

  while (reposToProcess.length > 0) {
    const currentGroup: TimelineRepo[] = [reposToProcess.shift()!]
    const groupDate = new Date(currentGroup[0].created_at)
    const groupX = getXPosition(groupDate)

    let i = 0
    while (i < reposToProcess.length) {
      const nextRepo = reposToProcess[i]
      const nextDate = new Date(nextRepo.created_at)
      const nextX = getXPosition(nextDate)

      if (Math.abs(nextX - groupX) < minLabelSpacing) {
        currentGroup.push(nextRepo)
        reposToProcess.splice(i, 1)
      } else {
        i++
      }
    }

    repoGroups.push(currentGroup)
  }

  // Collect languages actually present (deterministic order: by first occurrence in repos)
  const languagesPresent: string[] = []
  const seen = new Set<string>()
  for (const repo of repos) {
    const lang = repo.language || "Other"
    if (!seen.has(lang)) {
      seen.add(lang)
      languagesPresent.push(lang)
    }
  }

  const legendY = height - 26
  const legendStartX = width - padding - 24
  const legendItemSpacing = 54
  const legendParts: string[] = []
  let legendX = legendStartX
  for (let i = languagesPresent.length - 1; i >= 0; i--) {
    const lang = languagesPresent[i]
    const color = lang === "Other" ? LANGUAGE_COLORS.default : (LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS.default)
    legendParts.push(`
      <circle cx="${legendX}" cy="${legendY - 4}" r="4" fill="${color}" />
      <text x="${legendX + 10}" y="${legendY}" text-anchor="start" font-size="10" fill="var(--color-text-light)">${escapeXml(lang)}</text>
    `)
    legendX -= legendItemSpacing
  }
  const legendSvg = legendParts.length > 0 ? `
      <text x="${legendStartX}" y="${legendY - 14}" text-anchor="end" font-size="9" fill="var(--color-text-light)" opacity="0.8">Language</text>
      ${legendParts.join("")}
  ` : ""

  repoGroups.forEach((group, groupIndex) => {
    const groupTimestamp = group.reduce((sum, repo) => sum + new Date(repo.created_at).getTime(), 0) / group.length
    const groupDate = new Date(groupTimestamp)
    const x = getXPosition(groupDate)

    const isTop = groupIndex % 2 === 0

    group.forEach((repo, repoIndex) => {
      const offset = isTop ? -baseOffset : baseOffset
      const stackOffset = repoIndex * stackStep * (isTop ? -1 : 1)
      const labelY = timelineY + offset + stackOffset

      const color =
        repo.language && LANGUAGE_COLORS[repo.language] ? LANGUAGE_COLORS[repo.language] : LANGUAGE_COLORS.default

      const repoDate = new Date(repo.created_at)
      const repoX = getXPosition(repoDate)
      dots += `<circle cx="${repoX}" cy="${timelineY}" r="${dotRadius}" fill="${color}" />`

      if (group.length > 1 && Math.abs(repoX - x) > 5) {
        const controlX = (repoX + x) / 2
        const controlY = timelineY + (isTop ? -24 : 24)
        connections += `
          <path 
            d="M${repoX},${timelineY} Q${controlX},${controlY} ${x},${labelY}" 
            stroke="var(--color-connection)" 
            stroke-width="1.2" 
            fill="none" 
          />
        `
      } else {
        connections += `
          <line 
            x1="${repoX}" 
            y1="${timelineY}" 
            x2="${x}" 
            y2="${labelY}" 
            stroke="var(--color-connection)" 
            stroke-width="1.2" 
          />
        `
      }

      const displayName = repo.name.length > MAX_DISPLAY_NAME_LEN ? repo.name.substring(0, TRUNCATE_AT) + "..." : repo.name
      const yearCreated = new Date(repo.created_at).getFullYear()
      const tooltipText = `${repo.name}${repo.language ? ` · ${repo.language}` : ""} · ${yearCreated}`
      const titleEscaped = escapeXml(tooltipText)

      labels += `
        <g>
          <a href="${repo.html_url}" target="_blank">
            <title>${titleEscaped}</title>
            <rect 
              x="${x - labelWidth / 2}" 
              y="${labelY - labelHeight / 2}" 
              width="${labelWidth}" 
              height="${labelHeight}" 
              rx="${labelRadius}" 
              fill="var(--color-card)" 
              stroke="var(--color-border)" 
            />
            <text 
              x="${x}" 
              y="${labelY + 5}" 
              text-anchor="middle" 
              font-size="12" 
              fill="var(--color-text)"
            >${displayName}</text>
          </a>
        </g>
      `
    })
  })

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        :root {
          --color-primary: #3b82f6;
          --color-text: #374151;
          --color-text-light: #6b7280;
          --color-border: #e5e7eb;
          --color-card: #ffffff;
          --color-timeline: #d1d5db;
          --color-connection: #b0b8c2;
        }
        
        @media (prefers-color-scheme: dark) {
          :root {
            --color-primary: #60a5fa;
            --color-text: #e5e7eb;
            --color-text-light: #9ca3af;
            --color-border: #4b5563;
            --color-card: #1f2937;
            --color-timeline: #4b5563;
            --color-connection: #7b8290;
          }
        }
        
        text {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          fill: var(--color-text);
        }
        
        a:hover rect {
          stroke: var(--color-primary);
          stroke-width: 2;
        }
      </style>
      
      <rect width="${width}" height="${height}" fill="none" />
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">
        ${username}'s GitHub Journey
      </text>
      
      <!-- Timeline base line -->
      <line x1="${padding}" y1="${timelineY}" x2="${width - padding}" y2="${timelineY}" stroke="var(--color-timeline)" stroke-width="2" />
      
      <!-- Year markers -->
      ${years.join("")}
      
      <!-- Repository connections -->
      ${connections}
      
      <!-- Repository labels -->
      ${labels}
      
      <!-- Timeline dots -->
      ${dots}
      
      <!-- Language legend -->
      ${legendSvg}
      
      <!-- RetroRepo branding -->
      <text x="${padding}" y="${height - 15}" text-anchor="start" font-size="10" fill="var(--color-text-light)" opacity="0.7">
        Generated by RetroRepo
      </text>
    </svg>
  `
}
