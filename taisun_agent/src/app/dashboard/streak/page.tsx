import { Flame, Shield, Calendar } from 'lucide-react';

export default function StreakPage() {
  const currentStreak = 12;
  const longestStreak = 15;
  const freezesRemaining = 2;

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const active = i >= 17;
    return { date, active };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ストリーク</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <Flame className="w-8 h-8 mb-2" />
          <p className="text-sm opacity-80">現在の連続記録</p>
          <p className="text-4xl font-bold">{currentStreak}日</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <Calendar className="w-8 h-8 text-indigo-600 mb-2" />
          <p className="text-sm text-gray-500">最長記録</p>
          <p className="text-4xl font-bold text-gray-900">{longestStreak}日</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <Shield className="w-8 h-8 text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">フリーズ残り</p>
          <p className="text-4xl font-bold text-gray-900">{freezesRemaining}回</p>
          <p className="text-xs text-gray-400 mt-1">今月の残り回数</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">過去30日間</h2>
        <div className="grid grid-cols-10 gap-2">
          {last30Days.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                day.active
                  ? 'bg-orange-500 text-white font-medium'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={day.date.toLocaleDateString('ja-JP')}
            >
              {day.date.getDate()}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ストリークボーナス</h2>
        <div className="space-y-3">
          {[
            { days: 7, miles: 50, achieved: true },
            { days: 30, miles: 300, achieved: false },
            { days: 100, miles: 1000, achieved: false },
            { days: 365, miles: 5000, achieved: false },
          ].map((bonus) => (
            <div key={bonus.days} className={`flex items-center justify-between p-3 rounded-lg ${
              bonus.achieved ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <Flame className={`w-5 h-5 ${bonus.achieved ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{bonus.days}日連続</span>
              </div>
              <span className={`text-sm font-semibold ${bonus.achieved ? 'text-emerald-600' : 'text-gray-400'}`}>
                +{bonus.miles.toLocaleString()}マイル
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
