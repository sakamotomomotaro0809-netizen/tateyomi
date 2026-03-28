import { Coins, Award, Calendar, MessageSquare } from 'lucide-react';

const mockActivities = [
  { id: '1', type: 'earn', icon: Coins, title: 'デイリーログイン', miles: 5, time: '今日 09:00' },
  { id: '2', type: 'earn', icon: MessageSquare, title: 'コメント投稿', miles: 15, time: '今日 10:30' },
  { id: '3', type: 'badge', icon: Award, title: 'バッジ「読書家」獲得', miles: 0, time: '昨日 14:00' },
  { id: '4', type: 'earn', icon: Calendar, title: 'グルコン参加', miles: 100, time: '昨日 19:00' },
  { id: '5', type: 'earn', icon: Coins, title: 'コンテンツ閲覧完了', miles: 10, time: '2日前' },
];

export function RecentActivity() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h2>
      <div className="space-y-3">
        {mockActivities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
              {activity.miles > 0 && (
                <span className="text-sm font-semibold text-emerald-600">+{activity.miles}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
