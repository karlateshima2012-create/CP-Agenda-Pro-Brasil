
import React from 'react';
import { AccountInfo } from '../types';
import { LogOut } from 'lucide-react';

interface Props {
  account: AccountInfo;
  onLogout: () => void;
  onOpenPublic?: () => void;
}

export const DashboardHeader: React.FC<Props> = ({ account, onLogout }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-4 pb-12 mb-8 gap-4 px-6 md:px-10 bg-white -mx-4 md:-mx-8 -mt-4 md:-mt-8 shadow-sm">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
          Olá, {account.companyName}!
        </h1>
        <p className="text-gray-400 font-medium text-sm mt-1">
          Gerencie aqui os seus agendamentos.
        </p>
      </div>
    </div>
  );
};
