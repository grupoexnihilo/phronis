'use client';

import React, { useState } from 'react';
import Login from '@/views/Login';
import Dashboard from '@/views/Dashboard';
import TraderStation from '@/views/TraderStation';
import AnalystStation from '@/views/AnalystStation';
import ChiefStrategistStation from '@/views/ChiefStrategistStation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import HistoryStation from '@/views/HistoryStation'; 
import TraderArea from '@/views/TraderArea'; 
import SettingsStation from '@/views/SettingsStation';
import SimulationsView from '@/views/SimulationsView';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isConsultantMode, setIsConsultantMode] = useState(true); 
  const handleClientChange = (client) => {
    setSelectedClient(client);
  };
  // Se o estado 'user' estiver vazio, exibe a tela de Login capturando os dados do Neon
  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#05070a] overflow-hidden">
      {/* Sidebar Fixa */}
      <Sidebar currentView={currentView} setView={setCurrentView} />
      
      {/* Área da Direita */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} isConsultantMode={isConsultantMode} setIsConsultantMode={setIsConsultantMode} onClientChange={handleClientChange} />

        <main className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
          {/* 💡 AJUSTE: Passando o currentView para o Dashboard como havíamos planejado ontem */}
          {currentView === 'dashboard' && (
            <Dashboard selectedClient={selectedClient} user={user} currentView={currentView} />
          )}
          
          {currentView === 'trader' && (
  <TraderArea selectedClient={selectedClient} user={user} />
)}
          
          {/* Agora o pai sabe quem é o SimulationsView! */}
          {currentView === 'simulations' && <SimulationsView user={user} />}          
          {currentView === 'analyst' && <AnalystStation selectedClient={selectedClient} user={user} />}
          {currentView === 'chief_strategist' && <ChiefStrategistStation selectedClient={selectedClient} user={user} />}
          {currentView === 'history' && <HistoryStation selectedClient={selectedClient} user={user} />} 
          {currentView === 'trader_field' && <TraderStation selectedClient={selectedClient} user={user} />}         
          {currentView === 'settings' && (<SettingsStation selectedClient={selectedClient} user={user} />)}
        </main>
      </div>
    </div>
  );
}

export default App;