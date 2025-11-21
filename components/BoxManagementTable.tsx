
import React from 'react';
import { Box, BoxStatus, BoxSide, BoxLevel, OpeningType } from '../types';

interface BoxManagementTableProps {
  boxes: Box[];
  onUpdateBox: (box: Box) => void;
  profitabilityMap: Map<string, number>;
}

const EditableCell: React.FC<{
    value: string | number;
    type: 'text' | 'number';
    onSave: (newValue: string | number) => void;
}> = ({ value, type, onSave }) => {
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const newValue = type === 'number' ? parseFloat(e.target.value) : e.target.value;
        if (newValue !== value) {
            onSave(newValue);
        }
    };

    return (
        <input 
            type={type}
            defaultValue={value}
            onBlur={handleBlur}
            className="w-full px-2 py-1 bg-transparent border border-transparent focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-md transition-shadow"
        />
    );
};

const EditableSelectCell: React.FC<{
    value: string;
    options: string[];
    onSave: (newValue: string) => void;
}> = ({ value, options, onSave }) => {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onSave(e.target.value)}
                className="w-full pl-2 pr-8 py-1 bg-transparent border border-transparent focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-md appearance-none transition-shadow"
            >
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                 <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    );
};


const BoxManagementTable: React.FC<BoxManagementTableProps> = ({ boxes, onUpdateBox, profitabilityMap }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion Complète du Parc</h2>
        <p className="text-sm text-gray-500 mt-1">
          Modifiez les informations des boxes directement dans ce tableau. Les changements sont sauvegardés automatiquement.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">État</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prix (€/mois)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taille (m²)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Accès Côté:</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Niveau</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ouverture</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rentabilité</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {boxes.map(box => (
              <tr key={box.id} className="transition-colors duration-150 hover:bg-gray-50">
                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-800">#{box.id}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    <div className={`h-2.5 w-2.5 rounded-full mr-2 ${box.status === BoxStatus.Occupied ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <span className="text-sm text-gray-800">
                        {box.status === BoxStatus.Occupied ? 'Occupé' : 'Libre'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                    <EditableCell 
                        value={box.price}
                        type="number"
                        onSave={(newValue) => onUpdateBox({ ...box, price: newValue as number })}
                    />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                     <EditableCell 
                        value={box.size}
                        type="text"
                        onSave={(newValue) => onUpdateBox({ ...box, size: newValue as string })}
                    />
                </td>
                 <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                    <EditableSelectCell 
                        value={box.side}
                        options={Object.values(BoxSide)}
                        onSave={(newValue) => onUpdateBox({ ...box, side: newValue as BoxSide })}
                    />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                    <EditableSelectCell 
                        value={box.level}
                        options={Object.values(BoxLevel)}
                        onSave={(newValue) => onUpdateBox({ ...box, level: newValue as BoxLevel })}
                    />
                </td>
                 <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                    <EditableSelectCell 
                        value={box.opening}
                        options={Object.values(OpeningType)}
                        onSave={(newValue) => onUpdateBox({ ...box, opening: newValue as OpeningType })}
                    />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                     <EditableCell 
                        value={box.note || ''}
                        type="text"
                        onSave={(newValue) => onUpdateBox({ ...box, note: newValue as string })}
                    />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800 font-semibold">
                    {(profitabilityMap.get(box.id) || 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BoxManagementTable;
