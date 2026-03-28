import { Search, Filter } from 'lucide-react';

const mockMembers = [
  { id: '1', name: '田中太郎', email: 'tanaka@example.com', tier: 'GOLD', totalMiles: 8500, status: 'active' },
  { id: '2', name: '鈴木花子', email: 'suzuki@example.com', tier: 'GOLD', totalMiles: 7200, status: 'active' },
  { id: '3', name: '佐藤健一', email: 'sato@example.com', tier: 'SILVER', totalMiles: 3800, status: 'active' },
  { id: '4', name: '山田美咲', email: 'yamada@example.com', tier: 'BRONZE', totalMiles: 450, status: 'inactive' },
];

const tierLabels: Record<string, string> = {
  BRONZE: 'ブロンズ', SILVER: 'シルバー', GOLD: 'ゴールド', PLATINUM: 'プラチナ', DIAMOND: 'ダイヤモンド',
};

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">会員管理</h1>
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" placeholder="名前、メールで検索..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"><Filter className="w-4 h-4" />フィルター</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">名前</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">メール</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ティア</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">マイル</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-gray-100 font-medium">{tierLabels[member.tier]}</span></td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{member.totalMiles.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>{member.status === 'active' ? 'アクティブ' : '非アクティブ'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
