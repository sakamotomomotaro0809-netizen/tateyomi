import { Bell, Coins, Award, Calendar, Flame, Check } from 'lucide-react';

const mockNotifications = [
  { id: '1', type: 'mile_earned', title: 'マイル獲得', message: 'デイリーログインで+5マイル獲得しました', isRead: false, createdAt: '2026-02-08T09:00:00Z' },
  { id: '2', type: 'badge_earned', title: 'バッジ獲得', message: 'バッジ「初交換」を獲得しました！', isRead: false, createdAt: '2026-02-07T14:05:00Z' },
  { id: '3', type: 'event_reminder', title: 'イベントリマインド', message: '明日のグルコンをお忘れなく！', isRead: true, createdAt: '2026-02-07T12:00:00Z' },
  { id: '4', type: 'streak', title: 'ストリーク', message: '7日連続ログイン達成！+50マイルボーナス！', isRead: true, createdAt: '2026-02-06T09:00:00Z' },
  { id: '5', type: 'exchange', title: '交換承認', message: 'オリジナルTシャツの交換申請が承認されました', isRead: true, createdAt: '2026-02-05T15:00:00Z' },
];

const iconMap: Record<string, typeof Bell> = {
  mile_earned: Coins,
  badge_earned: Award,
  event_reminder: Calendar,
  streak: Flame,
  exchange: Check,
};

export default function NotificationsPage() {
  const unreadCount = mockNotifications.filter(n => !n.isRead).length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">通知</h1>
        {unreadCount > 0 && (
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">全て既読にする</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {mockNotifications.map((notif) => {
          const Icon = iconMap[notif.type] || Bell;
          return (
            <div key={notif.id} className={`p-4 flex items-start gap-3 ${!notif.isRead ? 'bg-indigo-50/50' : ''}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                !notif.isRead ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <Icon className={`w-5 h-5 ${!notif.isRead ? 'text-indigo-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                  {!notif.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString('ja-JP')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
