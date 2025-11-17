import GPXParser from 'gpxparser'
import { XMLParser } from 'fast-xml-parser'

export interface RidePoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
  speed_m_s?: number
  cum_dist_m?: number
}

export interface RideData {
  title?: string
  points: RidePoint[]
  startedAt?: Date
  finishedAt?: Date
  totalDistance: number
  elevationGain?: number
  maxSpeed?: number
  avgSpeed?: number
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate speed and cumulative distance
function enrichPoints(points: RidePoint[]): RidePoint[] {
  let cumulativeDistance = 0

  return points.map((point, index) => {
    if (index === 0) {
      return {
        ...point,
        speed_m_s: 0,
        cum_dist_m: 0,
      }
    }

    const prevPoint = points[index - 1]
    const distance = calculateDistance(
      prevPoint.lat,
      prevPoint.lon,
      point.lat,
      point.lon
    )
    cumulativeDistance += distance

    let speed = 0
    if (point.time && prevPoint.time) {
      const timeDiff = (point.time.getTime() - prevPoint.time.getTime()) / 1000 // seconds
      if (timeDiff > 0) {
        speed = distance / timeDiff
      }
    }

    return {
      ...point,
      speed_m_s: speed,
      cum_dist_m: cumulativeDistance,
    }
  })
}

// Parse GPX file
export async function parseGPX(fileContent: string): Promise<RideData> {
  const gpx = new GPXParser()
  gpx.parse(fileContent)

  const track = gpx.tracks[0]
  if (!track || !track.points || track.points.length === 0) {
    throw new Error('No track data found in GPX file')
  }

  const points: RidePoint[] = track.points.map((point: any) => ({
    lat: point.lat,
    lon: point.lon,
    ele: point.ele,
    time: point.time ? new Date(point.time) : undefined,
  }))

  const enrichedPoints = enrichPoints(points)

  // Calculate statistics
  const speeds = enrichedPoints
    .map(p => p.speed_m_s || 0)
    .filter(s => s > 0)
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0
  const avgSpeed = speeds.length > 0
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length
    : 0

  // Calculate elevation gain
  let elevationGain = 0
  for (let i = 1; i < enrichedPoints.length; i++) {
    const elevDiff = (enrichedPoints[i].ele || 0) - (enrichedPoints[i - 1].ele || 0)
    if (elevDiff > 0) {
      elevationGain += elevDiff
    }
  }

  return {
    title: track.name || 'Untitled Ride',
    points: enrichedPoints,
    startedAt: enrichedPoints[0].time,
    finishedAt: enrichedPoints[enrichedPoints.length - 1].time,
    totalDistance: enrichedPoints[enrichedPoints.length - 1].cum_dist_m || 0,
    elevationGain,
    maxSpeed,
    avgSpeed,
  }
}

// Parse TCX file
export async function parseTCX(fileContent: string): Promise<RideData> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })

  const result = parser.parse(fileContent)

  // Navigate TCX structure
  const activities = result.TrainingCenterDatabase?.Activities?.Activity
  if (!activities) {
    throw new Error('No activity data found in TCX file')
  }

  const activity = Array.isArray(activities) ? activities[0] : activities
  const laps = activity.Lap ? (Array.isArray(activity.Lap) ? activity.Lap : [activity.Lap]) : []

  const points: RidePoint[] = []

  laps.forEach((lap: any) => {
    const track = lap.Track
    const trackpoints = track?.Trackpoint
      ? (Array.isArray(track.Trackpoint) ? track.Trackpoint : [track.Trackpoint])
      : []

    trackpoints.forEach((tp: any) => {
      if (tp.Position) {
        points.push({
          lat: parseFloat(tp.Position.LatitudeDegrees),
          lon: parseFloat(tp.Position.LongitudeDegrees),
          ele: tp.AltitudeMeters ? parseFloat(tp.AltitudeMeters) : undefined,
          time: tp.Time ? new Date(tp.Time) : undefined,
        })
      }
    })
  })

  if (points.length === 0) {
    throw new Error('No trackpoints found in TCX file')
  }

  const enrichedPoints = enrichPoints(points)

  // Calculate statistics
  const speeds = enrichedPoints
    .map(p => p.speed_m_s || 0)
    .filter(s => s > 0)
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0
  const avgSpeed = speeds.length > 0
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length
    : 0

  // Calculate elevation gain
  let elevationGain = 0
  for (let i = 1; i < enrichedPoints.length; i++) {
    const elevDiff = (enrichedPoints[i].ele || 0) - (enrichedPoints[i - 1].ele || 0)
    if (elevDiff > 0) {
      elevationGain += elevDiff
    }
  }

  return {
    title: activity['@_Sport'] || 'Untitled Ride',
    points: enrichedPoints,
    startedAt: enrichedPoints[0].time,
    finishedAt: enrichedPoints[enrichedPoints.length - 1].time,
    totalDistance: enrichedPoints[enrichedPoints.length - 1].cum_dist_m || 0,
    elevationGain,
    maxSpeed,
    avgSpeed,
  }
}

// Parse either GPX or TCX based on file extension
export async function parseRideFile(
  file: File
): Promise<RideData> {
  const content = await file.text()
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'gpx') {
    return parseGPX(content)
  } else if (extension === 'tcx') {
    return parseTCX(content)
  } else {
    throw new Error('Unsupported file format. Please upload a GPX or TCX file.')
  }
}
