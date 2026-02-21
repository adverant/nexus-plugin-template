'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MainContent } from '@/components/MainContent';
import { StatusPanel } from '@/components/StatusPanel';
import { usePluginStore } from '@/hooks/usePluginStore';

export default function PluginPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { connectionStatus } = usePluginStore();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <Header connectionStatus={connectionStatus} />

      {/* Main Layout: 3-pane resizable */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Sidebar: Navigation */}
          <Panel defaultSize={18} minSize={12} maxSize={30}>
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </Panel>

          <PanelResizeHandle />

          {/* Center: Main Content Area */}
          <Panel defaultSize={55} minSize={30}>
            <MainContent activeTab={activeTab} />
          </Panel>

          <PanelResizeHandle />

          {/* Right: Status & Activity Panel */}
          <Panel defaultSize={27} minSize={15} maxSize={40}>
            <StatusPanel />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
