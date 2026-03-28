export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">ログイン</h1>
        <p className="text-center text-gray-500 mb-8">
          Clerk認証は外部API設定後に有効化されます
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input type="email" placeholder="email@example.com" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input type="password" placeholder="********" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" disabled />
          </div>
          <button className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed" disabled>
            ログイン（API設定後に有効化）
          </button>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">
          開発モード: 認証なしでダッシュボードにアクセス可能
        </p>
      </div>
    </div>
  );
}
