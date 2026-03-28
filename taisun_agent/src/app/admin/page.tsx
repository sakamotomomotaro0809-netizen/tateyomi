import { Users, Coins, ShoppingBag, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '総会員数', value: '5,234', icon: Users, color: 'indigo' },
          { title: 'マイル流通量', value: '2,345,000', icon: Coins, color: 'emerald' },
          { title: '今月の交換件数', value: '142', icon: ShoppingBag, color: 'purple' },
          { title: '今月のイベント', value: '8', icon: Calendar, color: 'orange' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h2>
        <p className="text-sm text-gray-500">管理機能はPhase 4で実装予定</p>
      </div>
    </div>
  );
}
