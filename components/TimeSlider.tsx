'use client'

import { useState, useEffect } from 'react'

interface RidePoint {
  lat: number
  lon: number
  ele?: number
  speed_m_s?: number
  cum_dist_m?: number
  t?: string
}

interface TimeSliderProps {
  points: RidePoint[]
  currentIndex: number
  onIndexChange: (index: number) => void
}

export default function TimeSlider({
  points,
  currentIndex,
  onIndexChange,
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      onIndexChange((currentIndex + 1) % points.length)
    }, 100 / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, currentIndex, playbackSpeed, points.length, onIndexChange])

  const currentPoint = points[currentIndex]

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--:--'
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP')
  }

  const formatSpeed = (ms?: number) => {
    if (ms === undefined) return '0.0'
    return (ms * 3.6).toFixed(1)
  }

  const formatElevation = (ele?: number) => {
    if (ele === undefined) return '0'
    return Math.round(ele).toString()
  }

  const formatDistance = (dist?: number) => {
    if (dist === undefined) return '0.00'
    return (dist / 1000).toFixed(2)
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {isPlaying ? '一時停止' : '再生'}
        </button>

        <button
          onClick={() => onIndexChange(0)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          最初に戻る
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">再生速度:</label>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={points.length - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false)
            onIndexChange(Number(e.target.value))
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatTime(points[0]?.t)}</span>
          <span>{formatTime(points[points.length - 1]?.t)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-xs text-gray-600 mb-1">時刻</div>
          <div className="text-lg font-semibold">{formatTime(currentPoint.t)}</div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-xs text-gray-600 mb-1">速度</div>
          <div className="text-lg font-semibold">
            {formatSpeed(currentPoint.speed_m_s)} <span className="text-sm">km/h</span>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-xs text-gray-600 mb-1">標高</div>
          <div className="text-lg font-semibold">
            {formatElevation(currentPoint.ele)} <span className="text-sm">m</span>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <div className="text-xs text-gray-600 mb-1">距離</div>
          <div className="text-lg font-semibold">
            {formatDistance(currentPoint.cum_dist_m)} <span className="text-sm">km</span>
          </div>
        </div>
      </div>
    </div>
  )
}
