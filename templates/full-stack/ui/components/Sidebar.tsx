'use client';

import { LayoutDashboard, ListTodo, BarChart3, Terminal, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'items', label: 'Items', icon: ListTodo },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Navigation items */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-brand-400')} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Help link */}
      <div className="p-2 border-t border-gray-800">
        <a
          href="https://adverant.ai/docs/plugins"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Documentation</span>
        </a>
      </div>
    </div>
  );
}
