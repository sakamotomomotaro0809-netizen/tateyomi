'use client';

import { Target, CheckCircle2 } from 'lucide-react';

const mockMissions = [
  { id: '1', title: '今日のおすすめ記事を読もう', reward: 20, progress: 1, target: 1, completed: true },
  { id: '2', title: 'コメントを1つ投稿しよう', reward: 20, progress: 0, target: 1, completed: false },
  { id: '3', title: '3つのコンテンツを閲覧しよう', reward: 20, progress: 1, target: 3, completed: false },
];

export function DailyMissions() {
  const completedCount = mockMissions.filter(m => m.completed).length;
  const allCompleted = completedCount === mockMissions.length;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">デイリーミッション</h2>
        <span className="text-sm text-gray-500">{completedCount}/{mockMissions.length}</span>
      </div>

      <div className="space-y-3">
        {mockMissions.map((mission) => (
          <div
            key={mission.id}
            className={`p-3 rounded-lg border ${
              mission.completed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {mission.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              ) : (
                <Target className="w-5 h-5 text-gray-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${mission.completed ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                  {mission.title}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {mission.progress}/{mission.target}
                  </span>
                  <span className="text-xs font-medium text-indigo-600">+{mission.reward}マイル</span>
                </div>
                {!mission.completed && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-center">
          <p className="text-sm font-medium text-indigo-700">
            全ミッション達成！+30 ボーナスマイル
          </p>
        </div>
      )}
    </div>
  );
}
