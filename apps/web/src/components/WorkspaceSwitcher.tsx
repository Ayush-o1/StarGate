import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { cn } from '../lib/utils';

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const [isOpen, setIsOpen]               = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [focusedIndex, setFocusedIndex]   = useState(-1);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isOpen) setFocusedIndex(-1);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, workspaces.length)); // +1 for "Create" option
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < workspaces.length) {
            setActiveWorkspaceId(workspaces[focusedIndex].id);
            setIsOpen(false);
            triggerRef.current?.focus();
          } else if (focusedIndex === workspaces.length) {
            setIsOpen(false);
            setShowCreateModal(true);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, focusedIndex, workspaces, setActiveWorkspaceId]
  );

  // Avatar: gradient initial based on workspace name
  const getAvatarStyle = (name: string) => {
    const hue = (name.charCodeAt(0) * 37) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 35%), hsl(${(hue + 40) % 360}, 60%, 25%))`,
    };
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button
          ref={triggerRef}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Current workspace: ${activeWorkspace?.name ?? 'Select workspace'}`}
          className={cn(
            'flex items-center gap-2 text-sm font-medium px-2.5 py-1.5 rounded-lg',
            'border transition-all duration-standard ease-snappy',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70',
            'focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
            isOpen
              ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
              : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
          )}
        >
          {/* Workspace avatar */}
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={activeWorkspace ? getAvatarStyle(activeWorkspace.name) : {}}
            aria-hidden="true"
          >
            {activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : '?'}
          </div>

          <span className="truncate max-w-[120px]">
            {activeWorkspace?.name ?? 'Select Workspace'}
          </span>

          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform duration-standard',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Workspaces"
            className={cn(
              'absolute top-full left-0 mt-2 w-64 z-50',
              'bg-zinc-900 border border-zinc-800 rounded-xl shadow-modal overflow-hidden',
              'animate-fade-in-scale'
            )}
          >
            <div className="p-1.5">
              {/* Section label */}
              <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider px-2.5 py-1.5 select-none">
                Workspaces
              </div>

              {/* Workspace list */}
              <div className="max-h-56 overflow-y-auto">
                {workspaces.length === 0 ? (
                  <div className="px-2.5 py-4 text-sm text-zinc-500 text-center">
                    No workspaces yet
                  </div>
                ) : (
                  workspaces.map((ws, i) => {
                    const isActive  = activeWorkspaceId === ws.id;
                    const isFocused = focusedIndex === i;
                    return (
                      <button
                        key={ws.id}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          setActiveWorkspaceId(ws.id);
                          setIsOpen(false);
                          triggerRef.current?.focus();
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg',
                          'transition-colors duration-instant',
                          'focus-visible:outline-none',
                          isActive
                            ? 'bg-brand-500/10 text-brand-400'
                            : isFocused
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                        )}
                      >
                        {/* Avatar */}
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={getAvatarStyle(ws.name)}
                          aria-hidden="true"
                        >
                          {ws.name.charAt(0).toUpperCase()}
                        </div>

                        <span className="truncate flex-1 text-left">{ws.name}</span>

                        {isActive && (
                          <Check className="w-3.5 h-3.5 shrink-0 text-brand-400" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer — Create workspace */}
            <div className="p-1.5 border-t border-zinc-800">
              <button
                role="option"
                aria-selected={false}
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg',
                  'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                  'transition-colors duration-instant',
                  focusedIndex === workspaces.length && 'bg-zinc-800 text-zinc-100'
                )}
              >
                <div className="w-6 h-6 rounded-md border border-dashed border-zinc-700 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Plus className="w-3 h-3" />
                </div>
                Create Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
};
