import { Award, Lock } from 'lucide-react';

const mockBadges = [
  { id: '1', name: 'ファーストステップ', description: '初回ログイン', rarity: 'COMMON', earned: true, earnedAt: '2026-01-15' },
  { id: '2', name: '自己紹介完了', description: 'プロフィール全項目入力', rarity: 'COMMON', earned: true, earnedAt: '2026-01-16' },
  { id: '3', name: 'はじめてのコメント', description: '初回コメント投稿', rarity: 'COMMON', earned: true, earnedAt: '2026-01-17' },
  { id: '4', name: '読書家', description: 'コンテンツ50件閲覧', rarity: 'COMMON', earned: true, earnedAt: '2026-01-25' },
  { id: '5', name: 'ヘルパー', description: '他メンバーへの回答10件', rarity: 'COMMON', earned: true, earnedAt: '2026-02-01' },
  { id: '6', name: '7日連続', description: '7日連続ログイン', rarity: 'COMMON', earned: true, earnedAt: '2026-01-22' },
  { id: '7', name: '初参加', description: '初回イベント参加', rarity: 'COMMON', earned: true, earnedAt: '2026-01-20' },
  { id: '8', name: '初交換', description: '初回マイル交換', rarity: 'COMMON', earned: true, earnedAt: '2026-02-07' },
  { id: '9', name: '学者', description: 'コンテンツ200件閲覧', rarity: 'RARE', earned: false },
  { id: '10', name: 'メンター', description: '他メンバーへの回答50件', rarity: 'RARE', earned: false },
  { id: '11', name: '30日連続', description: '30日連続ログイン', rarity: 'RARE', earned: false },
  { id: '12', name: '課題マスター', description: '課題10件提出', rarity: 'RARE', earned: false },
  { id: '13', name: '博士', description: 'コンテンツ500件閲覧', rarity: 'EPIC', earned: false },
  { id: '14', name: '招待王', description: '友達招待10人達成', rarity: 'EPIC', earned: false },
  { id: '15', name: '完全制覇', description: '全コンテンツ閲覧完了', rarity: 'LEGENDARY', earned: false },
  { id: '16', name: 'ダイヤモンド到達', description: 'ダイヤモンドティア初到達', rarity: 'LEGENDARY', earned: false },
];

const rarityConfig: Record<string, { label: string; color: string; border: string }> = {
  COMMON: { label: 'コモン', color: 'text-gray-600', border: 'border-gray-300' },
  RARE: { label: 'レア', color: 'text-blue-600', border: 'border-blue-300' },
  EPIC: { label: 'エピック', color: 'text-purple-600', border: 'border-purple-300' },
  LEGENDARY: { label: 'レジェンダリー', color: 'text-amber-600', border: 'border-amber-300' },
};

export default function BadgesPage() {
  const earnedCount = mockBadges.filter(b => b.earned).length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">バッジコレクション</h1>
        <span className="text-sm text-gray-500">{earnedCount} / {mockBadges.length} 獲得</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockBadges.map((badge) => {
          const config = rarityConfig[badge.rarity];
          return (
            <div
              key={badge.id}
              className={`bg-white rounded-xl p-4 border-2 ${badge.earned ? config.border : 'border-gray-200'} ${
                !badge.earned ? 'opacity-50' : ''
              } shadow-sm`}
            >
              <div className="flex items-center justify-center mb-3">
                {badge.earned ? (
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center`}>
                    <Award className={`w-8 h-8 ${config.color}`} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 text-center">{badge.name}</h3>
              <p className="text-xs text-gray-500 text-center mt-1">{badge.description}</p>
              <div className="flex justify-center mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} bg-opacity-10 font-medium`}>
                  {config.label}
                </span>
              </div>
              {badge.earned && badge.earnedAt && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  {new Date(badge.earnedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
