'use client';

import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { soundManager } from '@/lib/sound-feedback';

interface AudioWaveIndicatorProps {
  className?: string;
  showTestButton?: boolean;
}

export default function AudioWaveIndicator({
  className = '',
  showTestButton = true,
}: AudioWaveIndicatorProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsubscribe = soundManager.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });
    return unsubscribe;
  }, []);

  const handleTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.testSound();
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {isSpeaking ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] font-mono text-zinc-300">
          <Volume2 className="w-3 h-3 text-emerald-400" />
          <div className="flex items-end gap-0.5 h-2.5">
            <span className="w-0.5 bg-emerald-400 rounded-xs animate-pulse h-2" />
            <span className="w-0.5 bg-emerald-400 rounded-xs animate-pulse [animation-delay:150ms] h-2.5" />
            <span className="w-0.5 bg-emerald-400 rounded-xs animate-pulse [animation-delay:300ms] h-1.5" />
          </div>
          <span className="text-[10px] text-zinc-400 uppercase">Speaking</span>
        </div>
      ) : showTestButton ? (
        <button
          type="button"
          onClick={handleTest}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 text-xs font-mono transition"
          title="Test audio driver"
        >
          <Volume2 className="w-3 h-3" />
          <span className="hidden lg:inline text-[11px]">Audio</span>
        </button>
      ) : null}
    </div>
  );
}
