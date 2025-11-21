import React, { useState, useMemo } from 'react';
import { Box, Tenant, Agent, UserRole, BoxStatus, BoxSide, BoxLevel } from '../types';
import BoxTile from '../components/BoxTile';

interface BoxesPageProps {
  boxes: Box[];
  tenants: Tenant[];
  agents: Agent[];
  onBoxClick: (box: Box) => void;
  onInitiateReleaseBox: (boxId: string) => void;
  onShowHistory: (box: Box) => void;
  currentUserRole: UserRole;
  currentAgentId: string | null;
}

const FilterInput: React.FC<{ label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="text-sm font-medium text-slate-600 sr-only">{label}</label>
        <input 
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);

const FilterSelect: React.FC<{ label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {value: string, label: string}[] }> = ({ label, value, onChange, options }) => (
    <div>
        <label className="text-sm font-medium text-slate-600 sr-only">{label}</label>
        <select
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);


const BoxesPage: React.FC<BoxesPageProps> = ({ boxes, tenants, agents, onBoxClick, onInitiateReleaseBox, onShowHistory, currentUserRole, currentAgentId }) => {
  const [filters, setFilters] = useState({
    searchId: '',
    status: 'all',
    size: 'all',
    level: 'all',
    side: 'all',
  });

  const tenantsMap = useMemo(() => new Map(tenants.map(t => [t.id, t])), [tenants]);

  const uniqueSizes = useMemo(() => [...new Set(boxes.map(b => b.size))].sort(), [boxes]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters(prev => ({...prev, [name]: value}));
  };
  
  const filteredBoxes = useMemo(() => {
    return boxes.filter(box => {
      if (filters.searchId && !box.id.includes(filters.searchId)) return false;
      if (filters.status !== 'all' && box.status !== filters.status) return false;
      if (filters.size !== 'all' && box.size !== filters.size) return false;
      if (filters.level !== 'all' && box.level !== filters.level) return false;
      if (filters.side !== 'all' && box.side !== filters.side) return false;
      return true;
    });
  }, [boxes, filters]);

  const filterOptions = {
      status: [{value: 'all', label: 'Tous les statuts'}, {value: BoxStatus.Vacant, label: 'Libre'}, {value: BoxStatus.Occupied, label: 'Occupé'}],
      size: [{value: 'all', label: 'Toutes les tailles'}, ...uniqueSizes.map(s => ({value: s, label: s}))],
      level: [{value: 'all', label: 'Tous les niveaux'}, {value: BoxLevel.RDC, label: 'RDC'}, {value: BoxLevel.Niveau1, label: 'Niveau 1'}],
      side: [{value: 'all', label: 'Tous les côtés'}, {value: BoxSide.Cour, label: 'Cour'}, {value: BoxSide.Rue, label: 'Rue'}],
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Parc de Boxes</h1>
      
      <div className="bg-slate-100 p-4 rounded-lg mb-8 border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <FilterInput label="Rechercher par N°" value={filters.searchId} onChange={(e) => setFilters(f => ({...f, searchId: e.target.value}))} placeholder="Rechercher N°..."/>
            <FilterSelect label="Statut" value={filters.status} onChange={(e) => setFilters(f => ({...f, status: e.target.value}))} options={filterOptions.status} />
            <FilterSelect label="Taille" value={filters.size} onChange={(e) => setFilters(f => ({...f, size: e.target.value}))} options={filterOptions.size} />
            <FilterSelect label="Niveau" value={filters.level} onChange={(e) => setFilters(f => ({...f, level: e.target.value}))} options={filterOptions.level} />
            <FilterSelect label="Côté" value={filters.side} onChange={(e) => setFilters(f => ({...f, side: e.target.value}))} options={filterOptions.side} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {filteredBoxes.map(box => (
          <BoxTile
            key={box.id}
            box={box}
            tenant={box.currentTenantId ? tenantsMap.get(box.currentTenantId) : undefined}
            agents={agents}
            onClick={onBoxClick}
            onInitiateRelease={onInitiateReleaseBox}
            onShowHistory={onShowHistory}
            currentUserRole={currentUserRole}
            currentAgentId={currentAgentId}
          />
        ))}
        {filteredBoxes.length === 0 && (
            <div className="col-span-full text-center py-10">
                <p className="text-slate-500">Aucun box ne correspond à vos critères de recherche.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default BoxesPage;
