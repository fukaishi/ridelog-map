'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { parseRideFile } from '@/utils/gpxParser'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress('ファイルを読み込んでいます...')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ログインが必要です')

      // Parse the file
      setProgress('ファイルを解析しています...')
      const rideData = await parseRideFile(file)

      // Upload file to Supabase Storage
      setProgress('ファイルをアップロードしています...')
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const filePath = `${user.id}/${year}/${month}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('ride-logs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Create ride record in database
      setProgress('ライド情報を保存しています...')
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert({
          user_id: user.id,
          title: rideData.title,
          file_path: filePath,
          started_at: rideData.startedAt?.toISOString(),
          finished_at: rideData.finishedAt?.toISOString(),
          distance_m: rideData.totalDistance,
          elevation_gain_m: rideData.elevationGain,
          max_speed_m_s: rideData.maxSpeed,
          avg_speed_m_s: rideData.avgSpeed,
        })
        .select()
        .single()

      if (rideError) throw rideError

      // Insert ride points
      setProgress('トラックポイントを保存しています...')
      const pointsToInsert = rideData.points.map(point => ({
        ride_id: ride.id,
        t: point.time?.toISOString(),
        lat: point.lat,
        lon: point.lon,
        ele: point.ele,
        speed_m_s: point.speed_m_s,
        cum_dist_m: point.cum_dist_m,
      }))

      // Insert in batches of 1000
      const batchSize = 1000
      for (let i = 0; i < pointsToInsert.length; i += batchSize) {
        const batch = pointsToInsert.slice(i, i + batchSize)
        const { error: pointsError } = await supabase
          .from('ride_points')
          .insert(batch)

        if (pointsError) throw pointsError

        setProgress(
          `トラックポイントを保存中... (${Math.min(i + batchSize, pointsToInsert.length)}/${pointsToInsert.length})`
        )
      }

      setProgress('完了しました！')
      setTimeout(() => {
        setProgress('')
        if (onUploadComplete) onUploadComplete()
      }, 1500)

    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message)
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <>
                <svg
                  className="w-10 h-10 mb-3 text-blue-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-700">{progress}</p>
              </>
            ) : (
              <>
                <svg
                  className="w-10 h-10 mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">クリックしてアップロード</span>
                </p>
                <p className="text-xs text-gray-500">GPX または TCX ファイル</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept=".gpx,.tcx"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
