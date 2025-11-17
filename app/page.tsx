import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-8">RideLog Map</h1>
          <p className="text-xl mb-8">
            GPX/TCXファイルをアップロードして、ライドを可視化しましょう
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ログイン
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              新規登録
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
