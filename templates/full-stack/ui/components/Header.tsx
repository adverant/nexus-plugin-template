'use client';

import { Wifi, WifiOff, Settings, ExternalLink } from 'lucide-react';

const PLUGIN_NAME = process.env.NEXT_PUBLIC_PLUGIN_NAME || '{{PLUGIN_DISPLAY_NAME}}';

interface HeaderProps {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export function Header({ connectionStatus }: HeaderProps) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm shrink-0">
      {/* Left: Plugin branding */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {PLUGIN_NAME.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-100">{PLUGIN_NAME}</h1>
          <p className="text-[10px] text-gray-500">Adverant Nexus Plugin</p>
        </div>
      </div>

      {/* Right: Connection status + actions */}
      <div className="flex items-center gap-3">
        {/* WebSocket connection indicator */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Live</span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span className="text-[10px] text-yellow-400">Connecting</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-red-400">Offline</span>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-gray-700" />

        {/* Settings */}
        <button
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Open in Nexus Dashboard */}
        <a
          href="https://dashboard.adverant.ai/plugins"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          title="Open in Nexus Dashboard"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}
