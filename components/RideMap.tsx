'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RidePoint {
  lat: number
  lon: number
  ele?: number
  speed_m_s?: number
  cum_dist_m?: number
  t?: string
}

interface RideMapProps {
  points: RidePoint[]
  currentPointIndex?: number
}

// Speed to color mapping (m/s to color)
function speedToColor(speedMs: number): string {
  const speedKmh = speedMs * 3.6

  if (speedKmh < 10) return '#3b82f6' // blue
  if (speedKmh < 20) return '#10b981' // green
  if (speedKmh < 30) return '#fbbf24' // yellow
  if (speedKmh < 40) return '#f59e0b' // orange
  return '#ef4444' // red
}

export default function RideMap({ points, currentPointIndex }: RideMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const segmentsRef = useRef<L.Polyline[]>([])
  const currentMarkerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    // Initialize map if not already initialized
    if (!mapRef.current) {
      const map = L.map(containerRef.current).setView(
        [points[0].lat, points[0].lon],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      mapRef.current = map
    }

    const map = mapRef.current

    // Clear existing segments
    segmentsRef.current.forEach(segment => segment.remove())
    segmentsRef.current = []

    // Create segments with speed-based colors
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const avgSpeed = ((p1.speed_m_s || 0) + (p2.speed_m_s || 0)) / 2

      const segment = L.polyline(
        [
          [p1.lat, p1.lon],
          [p2.lat, p2.lon],
        ],
        {
          color: speedToColor(avgSpeed),
          weight: 4,
          opacity: 0.7,
        }
      ).addTo(map)

      segmentsRef.current.push(segment)
    }

    // Add start marker
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [12, 12],
    })

    L.marker([points[0].lat, points[0].lon], { icon: startIcon })
      .addTo(map)
      .bindPopup('スタート')

    // Add end marker
    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [12, 12],
    })

    L.marker([points[points.length - 1].lat, points[points.length - 1].lon], {
      icon: endIcon,
    })
      .addTo(map)
      .bindPopup('ゴール')

    // Fit bounds to show entire route
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]))
    map.fitBounds(bounds, { padding: [50, 50] })

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  // Update current position marker
  useEffect(() => {
    if (!mapRef.current || currentPointIndex === undefined) return

    const map = mapRef.current
    const point = points[currentPointIndex]

    // Remove existing marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove()
    }

    // Add new marker
    const markerIcon = L.divIcon({
      className: 'current-position-marker',
      html: '<div style="background-color: #8b5cf6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
    })

    currentMarkerRef.current = L.marker([point.lat, point.lon], {
      icon: markerIcon,
    }).addTo(map)

    // Pan to current position
    map.panTo([point.lat, point.lon])
  }, [currentPointIndex, points])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg" />
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
        <div className="text-xs font-semibold mb-2">速度</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#3b82f6' }} />
            <span>&lt; 10 km/h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#10b981' }} />
            <span>10-20 km/h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#fbbf24' }} />
            <span>20-30 km/h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#f59e0b' }} />
            <span>30-40 km/h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#ef4444' }} />
            <span>&gt; 40 km/h</span>
          </div>
        </div>
      </div>
    </div>
  )
}
