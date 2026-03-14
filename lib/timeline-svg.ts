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
  "Jupyter Notebook": "#da5b0b",
  default: "#6e7781",
}

const LEGEND_ABBREV: Record<string, string> = {
  "Jupyter Notebook": "Jupyter",
  TypeScript: "TS",
  JavaScript: "JS",
}

const MAX_DISPLAY_NAME_LEN = 24
const TRUNCATE_AT = 22
const LABEL_WIDTH = 180
const LABEL_HEIGHT = 26
const LABEL_VERTICAL_GAP = 12
const TITLE_ZONE_BOTTOM = 72
const LEGEND_ZONE_HEIGHT = 80
const RECT_MARGIN = 6

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function generateTimelineSvg(repos: TimelineRepo[], username: string): string {
  const width = 1200
  const height = 600
  const padding = 80
  const legendZoneTop = height - LEGEND_ZONE_HEIGHT
  const contentTop = TITLE_ZONE_BOTTOM
  const contentBottom = legendZoneTop
  const timelineY = contentTop + (contentBottom - contentTop) / 2
  const dotRadius = 5
  const labelHeight = LABEL_HEIGHT
  const labelWidth = LABEL_WIDTH
  const labelRadius = 6
  const baseOffset = 56
  const slotStep = labelHeight + LABEL_VERTICAL_GAP
  const labelMinY = contentTop + labelHeight / 2
  const labelMaxY = contentBottom - labelHeight / 2

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

  // Build candidate Y positions: above timeline first (descending), then below (ascending)
  const candidateYsAbove: number[] = []
  for (let y = timelineY - baseOffset; y >= labelMinY; y -= slotStep) candidateYsAbove.push(y)
  const candidateYsBelow: number[] = []
  for (let y = timelineY + baseOffset; y <= labelMaxY; y += slotStep) candidateYsBelow.push(y)
  const candidateYs = [...candidateYsAbove, ...candidateYsBelow]

  function rectsOverlapWithGap(
    aLeft: number,
    aTop: number,
    aRight: number,
    aBottom: number,
    bLeft: number,
    bTop: number,
    bRight: number,
    bBottom: number,
    gap: number
  ): boolean {
    return aLeft < bRight + gap && aRight > bLeft - gap && aTop < bBottom + gap && aBottom > bTop - gap
  }

  const placedRects: { left: number; top: number; right: number; bottom: number }[] = []

  for (const repo of repos) {
    const repoDate = new Date(repo.created_at)
    const repoX = getXPosition(repoDate)
    const halfW = labelWidth / 2
    const halfH = labelHeight / 2

    let labelY: number | null = null
    for (const cy of candidateYs) {
      const left = Math.floor(repoX - halfW)
      const right = Math.ceil(repoX + halfW)
      const top = Math.floor(cy - halfH)
      const bottom = Math.ceil(cy + halfH)
      if (top < contentTop || bottom > contentBottom) continue
      let overlaps = false
      for (const p of placedRects) {
        if (rectsOverlapWithGap(left, top, right, bottom, p.left, p.top, p.right, p.bottom, RECT_MARGIN)) {
          overlaps = true
          break
        }
      }
      if (!overlaps) {
        labelY = cy
        placedRects.push({ left, top, right, bottom })
        break
      }
    }
    if (labelY == null) {
      labelY = Math.max(labelMinY, Math.min(labelMaxY, timelineY + baseOffset))
      const left = Math.floor(repoX - halfW)
      const right = Math.ceil(repoX + halfW)
      const top = Math.floor(labelY - halfH)
      const bottom = Math.ceil(labelY + halfH)
      placedRects.push({ left, top, right, bottom })
    }

    const color =
      repo.language && LANGUAGE_COLORS[repo.language] ? LANGUAGE_COLORS[repo.language] : LANGUAGE_COLORS.default

    dots += `<circle cx="${repoX}" cy="${timelineY}" r="${dotRadius}" fill="${color}" />`
    connections += `
        <line x1="${repoX}" y1="${timelineY}" x2="${repoX}" y2="${labelY}" stroke="var(--color-connection)" stroke-width="1" />
      `

    const displayName = repo.name.length > MAX_DISPLAY_NAME_LEN ? repo.name.substring(0, TRUNCATE_AT) + "..." : repo.name
    const tooltipText = `${repo.name}${repo.language ? ` · ${repo.language}` : ""} · ${new Date(repo.created_at).getFullYear()}`
    const titleEscaped = escapeXml(tooltipText)

    labels += `
        <g>
          <a href="${repo.html_url}" target="_blank">
            <title>${titleEscaped}</title>
            <rect x="${repoX - halfW}" y="${labelY - halfH}" width="${labelWidth}" height="${labelHeight}" rx="${labelRadius}" fill="var(--color-card)" stroke="var(--color-border)" />
            <text x="${repoX}" y="${labelY + 5}" text-anchor="middle" font-size="12" fill="var(--color-text)">${displayName}</text>
          </a>
        </g>
      `
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

  const legendAreaY = legendZoneTop + 20
  const legendStartX = width - padding - 16
  const legendItemSpacing = 44
  const legendParts: string[] = []
  let legendX = legendStartX
  for (let i = languagesPresent.length - 1; i >= 0; i--) {
    const lang = languagesPresent[i]
    const displayLang = LEGEND_ABBREV[lang] ?? lang
    const color = lang === "Other" ? LANGUAGE_COLORS.default : (LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS.default)
    legendParts.push(`
      <circle cx="${legendX}" cy="${legendAreaY - 4}" r="3.5" fill="${color}" />
      <text x="${legendX + 8}" y="${legendAreaY}" text-anchor="start" font-size="9" fill="var(--color-text-light)">${escapeXml(displayLang)}</text>
    `)
    legendX -= legendItemSpacing
  }
  const legendSvg = legendParts.length > 0 ? `
      <text x="${legendStartX}" y="${legendAreaY - 12}" text-anchor="end" font-size="9" fill="var(--color-text-light)" opacity="0.8">Lang</text>
      ${legendParts.join("")}
  ` : ""

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
      
      <!-- Title (in reserved zone, no repo can overlap) -->
      <text x="${width / 2}" y="36" text-anchor="middle" font-size="18" font-weight="bold">
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
      
      <!-- RetroRepo branding (in reserved legend zone) -->
      <text x="${padding}" y="${height - 22}" text-anchor="start" font-size="10" fill="var(--color-text-light)" opacity="0.7">
        Generated by RetroRepo
      </text>
    </svg>
  `
}
