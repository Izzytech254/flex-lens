'use client';

import React from 'react';
import { Home, ScanLine, Wrench, History, Settings, MessageSquare } from 'lucide-react';
import type { ScreenType } from '@/components/FixLensApp';
import { Button, cx } from '@/components/ui';

interface WebNavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenVoiceModal: () => void;
  hasActiveReport: boolean;
}

type NavItem = { id: ScreenType; label: string; icon: React.ComponentType<{ className?: string }> };

export default function WebNavbar({ currentScreen, onNavigate, onOpenVoiceModal, hasActiveReport }: WebNavbarProps) {
  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scanner', label: 'Scan', icon: ScanLine },
    ...(hasActiveReport ? [{ id: 'fixguide' as ScreenType, label: 'Fix', icon: Wrench }] : []),
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (id: ScreenType) =>
    currentScreen === id || (id === 'fixguide' && (currentScreen === 'diagnosis' || currentScreen === 'verification'));

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-paper/85 backdrop-blur-md border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label="FixLens home"
          >
            <span className="w-7 h-7 rounded-lg bg-ink text-accent-400 flex items-center justify-center">
              <ScanLine className="w-3.5 h-3.5" />
            </span>
            <span className="hidden sm:inline font-display font-semibold text-[17px] tracking-tight leading-none text-ink">
              Fix<span className="text-accent-500">Lens</span>
            </span>
          </button>

          {/* Main links: shown on all screen sizes (scrolls sideways on very small screens) */}
          <nav
            aria-label="Main"
            className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0 h-full overflow-x-auto scrollbar-none"
          >
            {navItems.map((item) => {
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative h-full shrink-0 text-sm transition-colors focus-visible:outline-none focus-visible:text-ink',
                    active ? 'text-ink font-medium' : 'text-ink-soft hover:text-ink'
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-colors',
                      active ? 'bg-accent-500' : 'bg-transparent'
                    )}
                  />
                </button>
              );
            })}
          </nav>

          <div className="ml-auto shrink-0">
            <Button variant="primary" size="sm" onClick={onOpenVoiceModal} aria-label="Ask FixLens">
              <MessageSquare className="w-4 h-4 text-accent-400" />
              <span className="hidden sm:inline">Ask FixLens</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
