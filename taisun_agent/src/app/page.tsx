import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold text-indigo-600">GamiFi Members</h1>
        <p className="text-xl text-gray-600 max-w-xl">
          コミュニティ活動でマイルを獲得し、特典と交換できるゲーミフィケーション会員サイト
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            ダッシュボード
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
          >
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
