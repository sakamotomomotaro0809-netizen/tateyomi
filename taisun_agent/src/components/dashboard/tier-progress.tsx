import { cn } from '@/lib/utils';

interface TierProgressProps {
  currentTier: string;
  progress: number;
  currentMiles: number;
  nextTierMiles: number;
}

const tierConfig = {
  BRONZE: { label: 'ブロンズ', color: 'bg-amber-700', next: 'シルバー' },
  SILVER: { label: 'シルバー', color: 'bg-gray-400', next: 'ゴールド' },
  GOLD: { label: 'ゴールド', color: 'bg-yellow-500', next: 'プラチナ' },
  PLATINUM: { label: 'プラチナ', color: 'bg-gray-300', next: 'ダイヤモンド' },
  DIAMOND: { label: 'ダイヤモンド', color: 'bg-cyan-300', next: null },
};

export function TierProgress({ currentTier, progress, currentMiles, nextTierMiles }: TierProgressProps) {
  const config = tierConfig[currentTier as keyof typeof tierConfig] || tierConfig.BRONZE;
  const remaining = nextTierMiles - currentMiles;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">ティアランク</h2>
      <div className="flex items-center gap-4 mb-4">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', config.color)}>
          <span className="text-white font-bold">{config.label[0]}</span>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{config.label}</p>
          {config.next && (
            <p className="text-sm text-gray-500">
              次のランク「{config.next}」まであと <span className="font-semibold text-indigo-600">{remaining.toLocaleString()}</span> マイル
            </p>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{currentMiles.toLocaleString()} マイル</span>
        <span>{nextTierMiles.toLocaleString()} マイル</span>
      </div>
    </div>
  );
}
