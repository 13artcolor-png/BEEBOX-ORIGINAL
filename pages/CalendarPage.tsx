import React, { useState, useMemo } from 'react';
import { ActivityLog, Agent, UserRole } from '../types';

interface HistoryPageProps {
  logs: ActivityLog[];
  agents: Agent[];
  onDeleteLog?: (logId: string) => Promise<void>;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ logs, agents, onDeleteLog }) => {

  // Gère les deux formats de timestamp :
  // - Firestore Timestamp (SDK v8) : objet avec .toDate()
  // - Date JS (retourné par l'API REST firestoreGet)
  // - string ISO (fallback)
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    let date: Date | null = null;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'agent'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dropdown : uniquement les agents réellement enregistrés
  const registeredAgents = useMemo(() =>
    [...agents].sort((a, b) => a.name.localeCompare(b.name)),
    [agents]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (roleFilter === 'admin' && log.userRole !== UserRole.Admin) return false;
      if (roleFilter === 'agent' && log.userRole !== UserRole.Agent) return false;
      if (agentFilter !== 'all') {
        const agent = registeredAgents.find(a => a.id === agentFilter);
        if (!agent || log.userName !== agent.name) return false;
      }
      return true;
    });
  }, [logs, roleFilter, agentFilter, registeredAgents]);

  const handleRoleFilter = (role: 'all' | 'admin' | 'agent') => {
    setRoleFilter(role);
    setAgentFilter('all');
  };

  const handleDelete = async (logId: string) => {
    if (!onDeleteLog) return;
    if (!window.confirm('Supprimer cette entrée du journal ?')) return;
    setDeletingId(logId);
    try {
      await onDeleteLog(logId);
    } finally {
      setDeletingId(null);
    }
  };

  const btnClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
      active
        ? 'bg-slate-800 text-white border-slate-800'
        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Journal d'Activité</h1>
        <span className="text-sm text-slate-500">{filteredLogs.length} entrée{filteredLogs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Filtrer par rôle</p>
          <div className="flex gap-2">
            <button onClick={() => handleRoleFilter('all')} className={btnClass(roleFilter === 'all')}>Tous</button>
            <button onClick={() => handleRoleFilter('admin')} className={btnClass(roleFilter === 'admin')}>Admin uniquement</button>
            <button onClick={() => handleRoleFilter('agent')} className={btnClass(roleFilter === 'agent')}>Agents uniquement</button>
          </div>
        </div>

        {/* Dropdown agents enregistrés — visible si filtre = agent ou all */}
        {(roleFilter === 'agent' || roleFilter === 'all') && registeredAgents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Agent spécifique</p>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les agents</option>
              {registeredAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sm:pl-6">
                      Date & Heure
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Action
                    </th>
                    {onDeleteLog && (
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Supprimer
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-slate-500 sm:pl-6">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-800 font-medium">{log.userName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          log.userRole === UserRole.Admin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-600">{log.action}</td>
                      {onDeleteLog && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={deletingId === log.id}
                            className="text-red-400 hover:text-red-600 text-xs underline disabled:opacity-40 transition-colors"
                          >
                            {deletingId === log.id ? '...' : 'Supprimer'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-500">
                    {logs.length === 0
                      ? 'Aucune activité enregistrée pour le moment.'
                      : 'Aucune entrée ne correspond aux filtres sélectionnés.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
