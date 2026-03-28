export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">設定</h1>
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h2>
        <div className="space-y-4">
          {[
            { label: 'マイル獲得通知', description: 'マイルを獲得した時に通知' },
            { label: 'バッジ獲得通知', description: '新しいバッジを獲得した時に通知' },
            { label: 'イベントリマインド', description: 'イベント前日と1時間前に通知' },
            { label: 'ストリーク危機通知', description: '当日未ログイン時に21:00に通知' },
            { label: 'ランキング変動', description: 'ランキングが変動した時に通知' },
          ].map((setting, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                <p className="text-xs text-gray-500">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール設定</h2>
        <p className="text-sm text-gray-500">Clerk認証API設定後に編集可能になります</p>
      </div>
    </div>
  );
}
