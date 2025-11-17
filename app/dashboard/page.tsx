'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FileUpload from '@/components/FileUpload'

interface Ride {
  id: string
  title: string
  started_at: string
  distance_m: number
  elevation_gain_m: number
  avg_speed_m_s: number
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
    loadRides()
  }

  const loadRides = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error loading rides:', error)
    } else {
      setRides(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">RideLog Map</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">新しいライドをアップロード</h2>
            <FileUpload onUploadComplete={loadRides} />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">あなたのライド</h2>
            {rides.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                まだライドがありません。上からGPX/TCXファイルをアップロードしてください。
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rides.map((ride) => (
                  <Link
                    key={ride.id}
                    href={`/rides/${ride.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                  >
                    <h3 className="text-lg font-semibold mb-2">{ride.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {formatDate(ride.started_at)}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">距離:</span>
                        <span className="font-medium">{formatDistance(ride.distance_m)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">獲得標高:</span>
                        <span className="font-medium">{formatElevation(ride.elevation_gain_m)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均速度:</span>
                        <span className="font-medium">{formatSpeed(ride.avg_speed_m_s)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
