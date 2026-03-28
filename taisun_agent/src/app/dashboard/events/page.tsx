import { Calendar, MapPin, Users, Clock } from 'lucide-react';

const mockEvents = [
  { id: '1', title: '第15回グルコン', type: 'GROUP_CONSULT', date: '2026-02-15T19:00:00Z', location: 'オンライン（Zoom）', capacity: 30, registered: 22, milesReward: 100 },
  { id: '2', title: '東京オフ会 Vol.8', type: 'OFFLINE_MEETUP', date: '2026-02-22T18:00:00Z', location: '東京都渋谷区（詳細は参加者に通知）', capacity: 50, registered: 35, milesReward: 200 },
  { id: '3', title: '特別セミナー: AI活用術', type: 'ONLINE_SEMINAR', date: '2026-03-01T14:00:00Z', location: 'オンライン（Zoom）', capacity: 100, registered: 45, milesReward: 150 },
  { id: '4', title: '大阪オフ会 Vol.3', type: 'OFFLINE_MEETUP', date: '2026-03-08T18:00:00Z', location: '大阪市北区（詳細は参加者に通知）', capacity: 30, registered: 12, milesReward: 200 },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  GROUP_CONSULT: { label: 'グルコン', color: 'bg-indigo-100 text-indigo-700' },
  OFFLINE_MEETUP: { label: 'オフ会', color: 'bg-emerald-100 text-emerald-700' },
  ONLINE_SEMINAR: { label: 'セミナー', color: 'bg-purple-100 text-purple-700' },
  SPECIAL: { label: '特別イベント', color: 'bg-amber-100 text-amber-700' },
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">イベント</h1>
      <div className="space-y-4">
        {mockEvents.map((event) => {
          const type = typeLabels[event.type];
          const isFull = event.registered >= event.capacity;
          return (
            <div key={event.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type.color}`}>{type.label}</span>
                    <span className="text-xs text-indigo-600 font-medium">+{event.milesReward}マイル</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(event.date).toLocaleString('ja-JP')}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{event.registered}/{event.capacity}名</span>
                  </div>
                </div>
                <button
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    isFull
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                  disabled={isFull}
                >
                  {isFull ? '満員' : '参加登録'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
