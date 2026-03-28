import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const mockRanking = [
  { rank: 1, name: '田中太郎', miles: 8500, change: 0, tier: 'GOLD' },
  { rank: 2, name: '鈴木花子', miles: 7200, change: 1, tier: 'GOLD' },
  { rank: 3, name: '佐藤健一', miles: 6800, change: -1, tier: 'GOLD' },
  { rank: 4, name: '山田美咲', miles: 5400, change: 2, tier: 'GOLD' },
  { rank: 5, name: '高橋誠', miles: 4900, change: 0, tier: 'SILVER' },
  { rank: 6, name: '伊藤裕子', miles: 4500, change: -2, tier: 'SILVER' },
  { rank: 7, name: '渡辺大介', miles: 4100, change: 1, tier: 'SILVER' },
  { rank: 8, name: '小林真理', miles: 3800, change: 3, tier: 'SILVER' },
  { rank: 9, name: '加藤拓也', miles: 3500, change: -1, tier: 'SILVER' },
  { rank: 10, name: '松本えり', miles: 3300, change: 0, tier: 'SILVER' },
];

const tierColors: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-gray-100 text-gray-800',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-gray-200 text-gray-700',
  DIAMOND: 'bg-cyan-100 text-cyan-800',
};

const tierLabels: Record<string, string> = {
  BRONZE: 'ブロンズ', SILVER: 'シルバー', GOLD: 'ゴールド',
  PLATINUM: 'プラチナ', DIAMOND: 'ダイヤモンド',
};

export default function RankingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ランキング</h1>

      <div className="flex gap-2">
        {['週間', '月間', '全期間'].map((period, i) => (
          <button
            key={period}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              i === 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">順位</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">メンバー</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ティア</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">マイル</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">変動</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockRanking.map((user) => (
              <tr key={user.rank} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${
                    user.rank <= 3 ? 'text-indigo-600' : 'text-gray-900'
                  }`}>
                    {user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : `#${user.rank}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-indigo-700">{user.name[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${tierColors[user.tier]}`}>
                    {tierLabels[user.tier]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  {user.miles.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  {user.change > 0 && <span className="text-emerald-600 text-sm flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />+{user.change}</span>}
                  {user.change < 0 && <span className="text-red-500 text-sm flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" />{user.change}</span>}
                  {user.change === 0 && <span className="text-gray-400 text-sm flex items-center justify-center gap-1"><Minus className="w-3 h-3" />-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p className="text-sm text-indigo-700">
          <span className="font-semibold">あなたの順位: 32位</span> （先週比 +5）
        </p>
      </div>
    </div>
  );
}
