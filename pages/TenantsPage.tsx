

import React, { useState, useMemo } from 'react';
import { Tenant, Agent, UserRole, Agency, PaymentStatus } from '../types';

type SortKey = keyof Tenant | 'lastName' | 'startDate' | 'endDate' | 'id';

interface TenantsPageProps {
  tenants: Tenant[];
  agents: Agent[];
  agencies: Agency[];
  currentUserRole: UserRole;
  currentAgentId: string | null;
  onSendReminder: (tenantId: string) => void;
  onAddTenant: () => void;
  onEditTenant: (tenant: Tenant) => void;
}

const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR');
};

const SortableHeader: React.FC<{
    sortKey: SortKey;
    title: string;
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null;
    requestSort: (key: SortKey) => void;
    className?: string;
}> = ({ sortKey, title, sortConfig, requestSort, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';
    return (
        <th scope="col" className={`py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer ${className}`} onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-1">
                {title}
                <span className="text-slate-400">{directionIcon}</span>
            </div>
        </th>
    );
};


const TenantsPage: React.FC<TenantsPageProps> = ({ tenants, agents, agencies, currentUserRole, currentAgentId, onSendReminder, onAddTenant, onEditTenant }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'id', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // FIX: Explicitly type Maps to resolve 'unknown' type errors when accessing properties.
  const agentsMap = new Map<string, Agent>(agents.map(a => [a.id, a]));
  const agenciesMap = new Map<string, Agency>(agencies.map(a => [a.id, a]));

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
      if (searchTerm && !fullName.includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'active' && tenant.endDate) {
        return false;
      }
      if (statusFilter === 'past' && !tenant.endDate) {
        return false;
      }
      return true;
    });
  }, [tenants, searchTerm, statusFilter]);

  const sortedTenants = useMemo(() => {
    let sortableItems = [...filteredTenants];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTenants, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  const calculateRents = (tenant: Tenant) => {
      if (!tenant.startDate) return { brut: 0, net: 0 };
      const durationStart = new Date(tenant.startDate);
      if (isNaN(durationStart.getTime())) return { brut: 0, net: 0 };

      let durationEnd = tenant.endDate ? new Date(tenant.endDate) : new Date();
      if (tenant.endDate && isNaN(durationEnd.getTime())) {
          return { brut: 0, net: 0 };
      }
      
      if(durationEnd < durationStart) return { brut: 0, net: 0};

      const months = (durationEnd.getFullYear() - durationStart.getFullYear()) * 12 + (durationEnd.getMonth() - durationStart.getMonth()) + (durationEnd.getDate() > durationStart.getDate() ? 1 : 0);
      
      const totalMonthlyPrice = tenant.rentedBoxes.reduce((acc, rentedBox) => {
          return acc + rentedBox.price;
      }, 0);

      const brut = months > 0 ? months * totalMonthlyPrice : totalMonthlyPrice;
      
      const agent = agentsMap.get(tenant.agentId);
      const agency = agent ? agenciesMap.get(agent.agencyId) : undefined;
      
      if (!agency) return { brut, net: brut };

      const managementCost = brut * (agency.managementFee / 100);
      const net = brut - managementCost - agency.entryFee;
      
      return { brut, net };
  };

  const handleEditClick = (e: React.MouseEvent, tenant: Tenant) => {
    e.preventDefault();
    const canModify = currentUserRole === UserRole.Admin || currentAgentId === tenant.agentId;
    if (canModify) {
      onEditTenant(tenant);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.Paid:
            return 'bg-green-100 text-green-800';
        case PaymentStatus.Due:
            return 'bg-yellow-100 text-yellow-800';
        case PaymentStatus.Overdue:
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-slate-900">Locataires</h1>
          <p className="mt-2 text-sm text-slate-600">
            Liste de tous les locataires présents et passés.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
           <button
              type="button"
              onClick={onAddTenant}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Ajouter un locataire
            </button>
        </div>
      </div>
      <div className="mt-6 bg-slate-100 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4">
             <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="past">Passés</option>
            </select>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-100">
                  <tr>
                    <SortableHeader sortKey="id" title="ID" sortConfig={sortConfig} requestSort={requestSort} className="pl-4 pr-3 sm:pl-6" />
                    <SortableHeader sortKey="lastName" title="Nom & Contact" sortConfig={sortConfig} requestSort={requestSort} className="pl-4 pr-3 sm:pl-6" />
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut Paiement</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Boxes</th>
                    <SortableHeader sortKey="startDate" title="Entrée" sortConfig={sortConfig} requestSort={requestSort} className="px-3" />
                    <SortableHeader sortKey="endDate" title="Sortie" sortConfig={sortConfig} requestSort={requestSort} className="px-3" />
                    {currentUserRole === UserRole.Admin && (
                      <>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Loyers Nets</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Agent</th>
                      </>
                    )}
                     <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sortedTenants.map((tenant) => {
                    const { net } = currentUserRole === UserRole.Admin ? calculateRents(tenant) : { net: 0 };
                    const canModify = currentUserRole === UserRole.Admin || currentAgentId === tenant.agentId;
                    const canSendReminder = currentUserRole === UserRole.Admin && (tenant.paymentStatus === PaymentStatus.Due || tenant.paymentStatus === PaymentStatus.Overdue);
                    return (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-500 sm:pl-6">{tenant.id}</td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                         <div className="flex items-center">
                            <div className={`h-2.5 w-2.5 rounded-full mr-3 ${tenant.endDate ? 'bg-slate-400' : 'bg-green-400'}`}></div>
                            <div>
                                <div className="font-medium text-slate-900 flex items-center">
                                  {tenant.lastName} {tenant.firstName}
                                  {tenant.unpaidRent > 0 && <span title={`Loyer impayé: ${tenant.unpaidRent}€`} className="ml-2 w-3 h-3 bg-red-500 rounded-full"></span>}
                                </div>
                                <div className="text-slate-500">{tenant.email}</div>
                                <div className="text-xs text-slate-500">{tenant.address}, {tenant.postalCode} {tenant.city}</div>
                            </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(tenant.paymentStatus)}`}>
                            {tenant.paymentStatus}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">
                            Échéance: {safeFormatDate(tenant.nextDueDate)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{tenant.rentedBoxes.map(rb => `#${rb.boxId}`).join(', ')}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{safeFormatDate(tenant.startDate)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{tenant.endDate ? safeFormatDate(tenant.endDate) : <span className="text-green-700 font-medium">Présent</span>}</td>
                      {currentUserRole === UserRole.Admin && (
                        <>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{net.toFixed(2)} €</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{agentsMap.get(tenant.agentId)?.name || 'Inconnu'}</td>
                        </>
                      )}
                       <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6 space-x-2">
                        <a href="#" onClick={(e) => handleEditClick(e, tenant)} className={canModify ? "text-blue-600 hover:text-blue-900" : "text-gray-400 cursor-not-allowed"} aria-disabled={!canModify}>
                          Modifier
                        </a>
                        {canSendReminder && (
                            <button onClick={() => onSendReminder(tenant.id)} className="text-orange-600 hover:text-orange-900 font-medium">
                                Rappel
                            </button>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              {sortedTenants.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-slate-500">Aucun locataire ne correspond à vos critères de recherche.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantsPage;
