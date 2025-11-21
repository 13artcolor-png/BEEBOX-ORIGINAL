import React from 'react';
import { ActivityLog } from '../types';

interface HistoryPageProps {
  logs: ActivityLog[];
}

const HistoryPage: React.FC<HistoryPageProps> = ({ logs }) => {

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) {
      return 'Date invalide';
    }
    return timestamp.toDate().toLocaleString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Journal d'Activité</h1>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-slate-500 sm:pl-6">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-800 font-medium">{log.userName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{log.userRole}</td>
                      <td className="px-3 py-4 text-sm text-slate-600">{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-slate-500">Aucune activité enregistrée pour le moment.</p>
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
