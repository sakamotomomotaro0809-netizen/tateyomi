import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  color: 'indigo' | 'orange' | 'purple' | 'yellow' | 'emerald';
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-100' },
};

export function StatCard({ title, value, icon: Icon, change, changeType, color }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors.icon)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <p className={cn(
        'text-sm mt-2',
        changeType === 'positive' ? 'text-emerald-600' :
        changeType === 'negative' ? 'text-red-600' :
        'text-gray-500'
      )}>
        {change}
      </p>
    </div>
  );
}
