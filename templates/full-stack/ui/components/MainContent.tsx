'use client';

import { usePluginStore } from '@/hooks/usePluginStore';
import { LayoutDashboard, ListTodo, Plus, RefreshCw, BarChart3, Terminal } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MainContentProps {
  activeTab: string;
}

export function MainContent({ activeTab }: MainContentProps) {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab />;
    case 'items':
      return <ItemsTab />;
    case 'analytics':
      return <AnalyticsTab />;
    case 'terminal':
      return <TerminalTab />;
    case 'settings':
      return <SettingsTab />;
    default:
      return <OverviewTab />;
  }
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab() {
  const { pluginInfo } = usePluginStore();

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-brand-400" />
          Overview
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Plugin status and quick actions
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Status" value={pluginInfo ? 'Running' : 'Loading...'} color="emerald" />
          <StatCard label="Version" value={pluginInfo?.version || '1.0.0'} color="brand" />
          <StatCard label="Uptime" value={pluginInfo?.uptime ? formatUptime(pluginInfo.uptime) : '-'} color="blue" />
        </div>

        {/* Plugin Info */}
        {pluginInfo && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Plugin Information</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Name" value={pluginInfo.plugin} />
              <InfoRow label="Version" value={pluginInfo.version} />
              <InfoRow label="Memory (RSS)" value={`${pluginInfo.memory?.rss_mb || 0} MB`} />
              <InfoRow label="Heap Used" value={`${pluginInfo.memory?.heap_used_mb || 0} MB`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Items Tab
// ============================================================================

function ItemsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/items`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const createItem = async () => {
    const name = prompt('Item name:');
    if (!name) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: `Created at ${new Date().toLocaleString()}` }),
      });
      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-brand-400" />
              Items
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage your plugin items</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchItems}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={createItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading items...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No items yet</p>
            <p className="text-sm text-gray-600 mt-1">Create your first item to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-200">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-600">
                  <span>ID: {item.id?.slice(0, 8)}...</span>
                  <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Analytics Tab
// ============================================================================

function AnalyticsTab() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-400" />
          Analytics
        </h2>
        <p className="text-sm text-gray-500 mb-6">Usage metrics and insights</p>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Analytics dashboard</p>
          <p className="text-sm text-gray-600 mt-1">
            Implement your plugin-specific metrics and charts here
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Terminal Tab
// ============================================================================

function TerminalTab() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-brand-400" />
          Terminal
        </h2>
        <p className="text-sm text-gray-500 mb-6">Claude Code terminal integration</p>

        <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-3 gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[10px] text-gray-500 ml-2">Claude Code Terminal</span>
          </div>
          <div className="p-4 font-mono text-sm text-gray-400">
            <p className="text-gray-600"># Terminal integration</p>
            <p className="text-gray-600"># Connect this to your Claude Code terminal or</p>
            <p className="text-gray-600"># embed an iframe to the terminal UI</p>
            <p className="mt-2 text-emerald-400">$ nexus plugin status</p>
            <p className="text-gray-300">Plugin: {'{{PLUGIN_NAME}}'}</p>
            <p className="text-gray-300">Status: Running</p>
            <p className="text-gray-300">Version: 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Settings Tab
// ============================================================================

function SettingsTab() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          Settings
        </h2>
        <p className="text-sm text-gray-500 mb-6">Plugin configuration</p>

        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">General</h3>
            <div className="space-y-3">
              <SettingRow label="API URL" value={API_URL} />
              <SettingRow label="WebSocket URL" value={process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Nexus Integration</h3>
            <p className="text-sm text-gray-500">
              Configure your plugin&apos;s integration with Nexus services like GraphRAG, MageAgent, and the Skills Engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    brand: 'text-brand-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${colorMap[color] || 'text-gray-200'}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono text-xs">{value}</span>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">{value}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
