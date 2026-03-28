import { Coins, Trophy, Flame, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TierProgress } from '@/components/dashboard/tier-progress';
import { DailyMissions } from '@/components/dashboard/daily-missions';

// Mock data for development (APIs will be connected later)
const mockStats = {
  totalMiles: 3250,
  weeklyEarned: 420,
  currentStreak: 12,
  badgeCount: 8,
  tier: 'SILVER' as const,
  tierProgress: 65,
  nextTierMiles: 5000,
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">おかえりなさい！今日も活動してマイルを獲得しましょう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="マイル残高"
          value={mockStats.totalMiles.toLocaleString()}
          icon={Coins}
          change="+420 今週"
          changeType="positive"
          color="indigo"
        />
        <StatCard
          title="現在のストリーク"
          value={`${mockStats.currentStreak}日`}
          icon={Flame}
          change="最長記録更新中！"
          changeType="positive"
          color="orange"
        />
        <StatCard
          title="獲得バッジ"
          value={`${mockStats.badgeCount}個`}
          icon={Award}
          change="全30個中"
          changeType="neutral"
          color="purple"
        />
        <StatCard
          title="ランキング"
          value="32位"
          icon={Trophy}
          change="+5 先週比"
          changeType="positive"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TierProgress
            currentTier={mockStats.tier}
            progress={mockStats.tierProgress}
            currentMiles={mockStats.totalMiles}
            nextTierMiles={mockStats.nextTierMiles}
          />
          <RecentActivity />
        </div>
        <div>
          <DailyMissions />
        </div>
      </div>
    </div>
  );
}
