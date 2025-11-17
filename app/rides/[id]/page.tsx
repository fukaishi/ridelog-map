'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import TimeSlider from '@/components/TimeSlider'

// Dynamic import for RideMap to avoid SSR issues with Leaflet
const RideMap = dynamic(() => import('@/components/RideMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-xl">地図を読み込んでいます...</div>
    </div>
  ),
})

interface Ride {
  id: string
  title: string
  description?: string
  started_at: string
  finished_at: string
  distance_m: number
  elevation_gain_m: number
  max_speed_m_s: number
  avg_speed_m_s: number
}

interface RidePoint {
  lat: number
  lon: number
  ele?: number
  speed_m_s?: number
  cum_dist_m?: number
  t?: string
}

// Required for static export with dynamic routes
// Returns empty array since rides are user-generated and unknown at build time
// Pages will be rendered client-side on demand
export async function generateStaticParams() {
  return []
}

export default function RidePage() {
  const params = useParams()
  const router = useRouter()
  const [ride, setRide] = useState<Ride | null>(null)
  const [points, setPoints] = useState<RidePoint[]>([])
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRide()
  }, [params.id])

  const loadRide = async () => {
    setLoading(true)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Load ride metadata
    const { data: rideData, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', params.id)
      .single()

    if (rideError || !rideData) {
      console.error('Error loading ride:', rideError)
      router.push('/dashboard')
      return
    }

    setRide(rideData)

    // Load ride points
    const { data: pointsData, error: pointsError } = await supabase
      .from('ride_points')
      .select('lat, lon, ele, speed_m_s, cum_dist_m, t')
      .eq('ride_id', params.id)
      .order('t', { ascending: true })

    if (pointsError) {
      console.error('Error loading points:', pointsError)
    } else {
      setPoints(pointsData || [])
    }

    setLoading(false)
  }

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + ' km'
  }

  const formatSpeed = (ms: number) => {
    return (ms * 3.6).toFixed(1) + ' km/h'
  }

  const formatElevation = (meters: number) => {
    return Math.round(meters) + ' m'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}時間${minutes}分`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">ライドが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← ダッシュボードに戻る
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{ride.title}</h1>
            {ride.description && (
              <p className="text-gray-600 mb-4">{ride.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              <div>
                <div className="text-sm text-gray-600">開始時刻</div>
                <div className="font-semibold">{formatDate(ride.started_at)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">所要時間</div>
                <div className="font-semibold">
                  {formatDuration(ride.started_at, ride.finished_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">距離</div>
                <div className="font-semibold">{formatDistance(ride.distance_m)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">獲得標高</div>
                <div className="font-semibold">{formatElevation(ride.elevation_gain_m)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">平均速度</div>
                <div className="font-semibold">{formatSpeed(ride.avg_speed_m_s)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6" style={{ height: '500px' }}>
            {points.length > 0 ? (
              <RideMap points={points} currentPointIndex={currentPointIndex} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">トラックデータがありません</div>
              </div>
            )}
          </div>

          {points.length > 0 && (
            <TimeSlider
              points={points}
              currentIndex={currentPointIndex}
              onIndexChange={setCurrentPointIndex}
            />
          )}
        </div>
      </main>
    </div>
  )
}
