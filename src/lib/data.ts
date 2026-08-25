import { promises as fs } from 'fs'
import path from 'path'
import type {
  Quadrant,
  QuadrantCategory,
  RightNow,
  TimelineEntry,
  Goals,
  InspirationItem,
  Metadata,
  DashboardData,
} from '@/types/dashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any

const USE_DB = !!process.env.DATABASE_URL

async function readJsonFile(filename: string) {
  const filePath = path.join(process.cwd(), 'data', filename)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

async function db() {
  const { prisma } = await import('@/lib/prisma')
  return prisma
}

export async function getQuadrants(): Promise<Record<QuadrantCategory, Quadrant>> {
  if (!USE_DB) {
    return await readJsonFile('quadrants.json')
  }

  try {
    const prisma = await db()
    const rows = await prisma.quadrant.findMany()

    const defaultQuadrant = (cat: QuadrantCategory): Quadrant => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      category: cat,
      color: '',
      status: 'needs_attention' as const,
      lastActivity: new Date().toISOString(),
      activityPulse: false,
      recentEntries: [],
      metrics: {},
    })

    const result: Record<QuadrantCategory, Quadrant> = {
      relationships: defaultQuadrant('relationships'),
      parkour: defaultQuadrant('parkour'),
      work: defaultQuadrant('work'),
      travel: defaultQuadrant('travel'),
    }

    for (const row of rows as AnyRecord[]) {
      const category = row.category as QuadrantCategory
      const extra = (row.extraData as Record<string, unknown>) || {}

      result[category] = {
        name: row.name,
        category,
        color: row.color,
        status: row.status as Quadrant['status'],
        lastActivity: row.lastActivity,
        activityPulse: row.activityPulse,
        recentEntries: (row.recentEntries as unknown as TimelineEntry[]) || [],
        metrics: (row.metrics as Record<string, string | number>) || {},
        people: row.people as unknown as Quadrant['people'],
        skills: row.skills as unknown as Quadrant['skills'],
        githubStats: row.githubStats as unknown as Quadrant['githubStats'],
        travelStats: row.travelStats as unknown as Quadrant['travelStats'],
        ...extra,
      }
    }

    return result
  } catch (err) {
    console.error('[data] getQuadrants DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('quadrants.json')
  }
}

export async function getRightNow(): Promise<RightNow> {
  if (!USE_DB) {
    return await readJsonFile('right_now.json')
  }

  try {
    const prisma = await db()
    const snapshot = await prisma.rightNowSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!snapshot) {
      return {
        weekOf: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        quadrantStatuses: {
          relationships: 'needs_attention',
          parkour: 'needs_attention',
          work: 'needs_attention',
          travel: 'needs_attention',
        },
        summary: 'No data yet. Run a processing cycle to populate.',
        valuesAlignment: { score: 0, livingWell: [], needsAttention: [], note: '' },
        actionables: [],
        celebration: '',
        friendlyNote: '',
      }
    }

    const extra = (snapshot.extraData as Record<string, unknown>) || {}

    return {
      weekOf: snapshot.weekOf,
      lastUpdated: snapshot.lastUpdated,
      quadrantStatuses: snapshot.quadrantStatuses as unknown as RightNow['quadrantStatuses'],
      summary: snapshot.summary,
      valuesAlignment: snapshot.valuesAlignment as unknown as RightNow['valuesAlignment'],
      actionables: snapshot.actionables as unknown as RightNow['actionables'],
      celebration: snapshot.celebration,
      friendlyNote: snapshot.friendlyNote,
      ...extra,
    } as RightNow
  } catch (err) {
    console.error('[data] getRightNow DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('right_now.json')
  }
}

export async function getTimeline(): Promise<TimelineEntry[]> {
  if (!USE_DB) {
    return await readJsonFile('timeline.json')
  }

  try {
    const prisma = await db()
    const entries = await prisma.timelineEntry.findMany({
      orderBy: { date: 'desc' },
    })

    return entries.map((e: AnyRecord) => ({
      id: e.id,
      date: e.date,
      category: e.category as QuadrantCategory,
      title: e.title,
      content: e.content,
      imageUrl: e.imageUrl || undefined,
      sourceNote: e.sourceNote || undefined,
      significance: e.significance as TimelineEntry['significance'],
    }))
  } catch (err) {
    console.error('[data] getTimeline DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('timeline.json')
  }
}

export async function getGoals(): Promise<Goals> {
  if (!USE_DB) {
    return await readJsonFile('goals.json')
  }

  try {
    const prisma = await db()
    const goals = await prisma.goal.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const values = await prisma.value.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return {
      nearFuture: goals
        .filter((g: AnyRecord) => g.timeframe === 'near')
        .map((g: AnyRecord) => ({
          id: g.id,
          text: g.text,
          category: (g.category as QuadrantCategory) || undefined,
          completed: g.completed,
          progress: g.progress || undefined,
          createdAt: g.createdAt.toISOString().split('T')[0],
          completedAt: g.completedAt?.toISOString().split('T')[0],
        })),
      farFuture: goals
        .filter((g: AnyRecord) => g.timeframe === 'far')
        .map((g: AnyRecord) => ({
          id: g.id,
          text: g.text,
          category: (g.category as QuadrantCategory) || undefined,
          completed: g.completed,
          createdAt: g.createdAt.toISOString().split('T')[0],
          completedAt: g.completedAt?.toISOString().split('T')[0],
        })),
      values: values.map((v: AnyRecord) => v.text),
    } as Goals
  } catch (err) {
    console.error('[data] getGoals DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('goals.json')
  }
}

export async function getInspiration(): Promise<InspirationItem[]> {
  if (!USE_DB) {
    return await readJsonFile('inspiration.json')
  }

  try {
    const prisma = await db()
    const items = await prisma.inspirationItem.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return items.map((i: AnyRecord) => ({
      id: i.id,
      category: i.category as InspirationItem['category'],
      type: i.type as InspirationItem['type'],
      title: i.title,
      content: i.content,
      source: i.source || undefined,
      personName: i.personName || undefined,
      addedAt: i.addedAt,
      tags: (i.tags as string[]) || undefined,
    }))
  } catch (err) {
    console.error('[data] getInspiration DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('inspiration.json')
  }
}

export async function getMetadata(): Promise<Metadata> {
  if (!USE_DB) {
    return await readJsonFile('metadata.json')
  }

  try {
    const prisma = await db()
    const meta = await prisma.processingMetadata.findUnique({
      where: { id: 'singleton' },
    })

    if (!meta) {
      return {
        lastProcessed: '',
        lastNoteScanned: '',
        totalEntriesProcessed: 0,
        version: '1.0.0',
      }
    }

    return {
      lastProcessed: meta.lastProcessed || '',
      lastNoteScanned: meta.lastNoteScanned || '',
      totalEntriesProcessed: meta.totalEntriesProcessed,
      version: meta.version,
    }
  } catch (err) {
    console.error('[data] getMetadata DB read failed, using JSON fallback:', (err as Error).message)
    return await readJsonFile('metadata.json')
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [quadrants, rightNow, timeline, goals, inspiration, metadata] = await Promise.all([
    getQuadrants(),
    getRightNow(),
    getTimeline(),
    getGoals(),
    getInspiration(),
    getMetadata(),
  ])

  return {
    quadrants,
    rightNow,
    timeline,
    goals,
    inspiration,
    metadata,
  }
}

// Utility function to get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'thriving':
      return 'bg-status-thriving'
    case 'needs_attention':
      return 'bg-status-attention'
    case 'neglected':
      return 'bg-status-neglected'
    default:
      return 'bg-gray-500'
  }
}

// Utility function to get quadrant color
export function getQuadrantColor(category: QuadrantCategory): string {
  const colors: Record<QuadrantCategory, string> = {
    relationships: '#FF6B6B',
    parkour: '#4ECDC4',
    work: '#9B59B6',
    travel: '#F9CA24',
  }
  return colors[category]
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

// Get days since a date
export function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
