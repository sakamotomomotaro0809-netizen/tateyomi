import { Target, CheckCircle2, Gift } from 'lucide-react';

const mockMissions = [
  { id: '1', title: '今日のおすすめ記事を読もう', description: '指定コンテンツの閲覧を完了', reward: 20, progress: 1, target: 1, completed: true },
  { id: '2', title: 'コメントを1つ投稿しよう', description: 'コメント1件投稿', reward: 20, progress: 0, target: 1, completed: false },
  { id: '3', title: '3つのコンテンツを閲覧しよう', description: 'コンテンツ3件閲覧', reward: 20, progress: 1, target: 3, completed: false },
];

export default function MissionsPage() {
  const completedCount = mockMissions.filter(m => m.completed).length;
  const totalReward = mockMissions.reduce((sum, m) => sum + m.reward, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">デイリーミッション</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <p className="text-sm text-gray-500">達成状況</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{completedCount}/{mockMissions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <p className="text-sm text-gray-500">獲得可能マイル</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{totalReward}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <p className="text-sm text-gray-500">全達成ボーナス</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">+30</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockMissions.map((mission) => (
          <div key={mission.id} className={`bg-white rounded-xl p-6 border ${
            mission.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
          } shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                mission.completed ? 'bg-emerald-100' : 'bg-indigo-50'
              }`}>
                {mission.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Target className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-semibold ${mission.completed ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {mission.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{mission.description}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{mission.progress}/{mission.target}</span>
                    <span className="text-xs font-medium text-indigo-600">+{mission.reward}マイル</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${mission.completed ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
