import { Coins, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

const mockTransactions = [
  { id: '1', type: 'EARN', source: 'daily_login', description: 'デイリーログイン', amount: 5, createdAt: '2026-02-08T09:00:00Z' },
  { id: '2', type: 'EARN', source: 'content_view', description: 'コンテンツ閲覧完了', amount: 10, createdAt: '2026-02-08T10:30:00Z' },
  { id: '3', type: 'EARN', source: 'comment_post', description: 'コメント投稿', amount: 15, createdAt: '2026-02-08T11:00:00Z' },
  { id: '4', type: 'REDEEM', source: 'exchange', description: '商品交換: オリジナルTシャツ', amount: -500, createdAt: '2026-02-07T14:00:00Z' },
  { id: '5', type: 'EARN', source: 'group_consult', description: 'グルコン参加', amount: 100, createdAt: '2026-02-07T19:00:00Z' },
  { id: '6', type: 'EARN', source: 'streak_bonus_7', description: '7日連続ログインボーナス', amount: 50, createdAt: '2026-02-06T09:00:00Z' },
  { id: '7', type: 'EARN', source: 'help_answer', description: 'ベストアンサー選定', amount: 30, createdAt: '2026-02-05T16:00:00Z' },
  { id: '8', type: 'EARN', source: 'task_submit', description: '課題提出', amount: 50, createdAt: '2026-02-04T10:00:00Z' },
];

export default function MilesPage() {
  const totalBalance = 3250;
  const monthlyEarned = 1820;
  const monthlySpent = 500;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">マイル</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            <p className="text-sm text-gray-500">現在の残高</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBalance.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">マイル</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-gray-500">今月の獲得</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600">+{monthlyEarned.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">マイル</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-red-500" />
            <p className="text-sm text-gray-500">今月の消費</p>
          </div>
          <p className="text-3xl font-bold text-red-500">-{monthlySpent.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">マイル</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">取引履歴</h2>
          <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.type === 'EARN' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {tx.type === 'EARN' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('ja-JP')}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${
                tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
