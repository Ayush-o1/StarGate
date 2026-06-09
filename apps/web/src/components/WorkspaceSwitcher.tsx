import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { ChevronDown, Plus, Check, Briefcase } from 'lucide-react';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/30 hover:bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/50 transition-colors"
        >
          <div className="w-5 h-5 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400">
            <Briefcase className="w-3 h-3" />
          </div>
          <span className="truncate max-w-[120px]">
            {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1.5">
                Workspaces
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-lg transition-colors ${
                      activeWorkspaceId === ws.id 
                        ? 'bg-indigo-500/10 text-indigo-400' 
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 bg-gray-800 rounded flex items-center justify-center text-gray-400 shrink-0">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {activeWorkspaceId === ws.id && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
                
                {workspaces.length === 0 && (
                  <div className="px-2 py-3 text-sm text-gray-500 text-center">
                    No workspaces found
                  </div>
                )}
              </div>
            </div>
            <div className="p-2 border-t border-gray-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
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
