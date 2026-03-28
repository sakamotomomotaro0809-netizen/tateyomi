'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Coins, Trophy, Award, Flame,
  Target, ShoppingBag, Calendar, Bell, Settings, Users, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/dashboard/miles', label: 'マイル', icon: Coins },
  { href: '/dashboard/ranking', label: 'ランキング', icon: Trophy },
  { href: '/dashboard/badges', label: 'バッジ', icon: Award },
  { href: '/dashboard/streak', label: 'ストリーク', icon: Flame },
  { href: '/dashboard/missions', label: 'ミッション', icon: Target },
  { href: '/dashboard/exchange', label: '交換カタログ', icon: ShoppingBag },
  { href: '/dashboard/events', label: 'イベント', icon: Calendar },
  { href: '/dashboard/notifications', label: '通知', icon: Bell },
  { href: '/dashboard/settings', label: '設定', icon: Settings },
];

const adminItems = [
  { href: '/admin', label: '管理ダッシュボード', icon: BarChart3 },
  { href: '/admin/members', label: '会員管理', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="text-lg font-bold text-gray-900">GamiFi</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-2">管理者</p>
          {adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
