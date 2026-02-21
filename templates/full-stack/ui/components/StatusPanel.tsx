'use client';

import { usePluginStore } from '@/hooks/usePluginStore';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

export function StatusPanel() {
  const { events, connectionStatus } = usePluginStore();

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
      {/* Panel header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-medium text-gray-300">Activity</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`} />
          <span className="text-[10px] text-gray-500">
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Zap className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs text-gray-500">No activity yet</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Real-time events will appear here as they happen
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {events.map((event, index) => (
              <EventItem key={index} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Connection info footer */}
      <div className="px-4 py-2 border-t border-gray-800 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>{events.length} events</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

interface PluginEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

function EventItem({ event }: { event: PluginEvent }) {
  const getEventIcon = (type: string) => {
    if (type.includes('error')) return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (type.includes('created') || type.includes('updated')) return <Zap className="w-3 h-3 text-brand-400" />;
    return <Clock className="w-3 h-3 text-gray-500" />;
  };

  const getEventColor = (type: string) => {
    if (type.includes('error')) return 'border-red-500/20';
    if (type.includes('created')) return 'border-emerald-500/20';
    if (type.includes('updated')) return 'border-blue-500/20';
    return 'border-gray-800';
  };

  return (
    <div className={`rounded-md border ${getEventColor(event.type)} bg-gray-950/50 p-2.5`}>
      <div className="flex items-center gap-2 mb-1">
        {getEventIcon(event.type)}
        <span className="text-[11px] font-medium text-gray-300">{event.type}</span>
      </div>
      <p className="text-[10px] text-gray-500 font-mono">
        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-'}
      </p>
    </div>
  );
}
