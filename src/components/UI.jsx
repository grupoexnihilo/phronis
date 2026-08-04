import React from 'react';

export const Card = ({ children, className = "" }) => (
  <div className={`rounded-3xl border border-slate-800 bg-slate-900/50 p-6 ${className}`}>
    {children}
  </div>
);

export const Input = ({ label, icon: Icon, ...props }) => (
  <div className="space-y-2">
    {label && <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />}
      <input 
        {...props} 
        className={`w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 ${Icon ? 'pl-12' : 'px-4'} pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all`}
      />
    </div>
  </div>
);

export const Button = ({ children, isLoading, icon: Icon, className = "", ...props }) => (
  <button 
    {...props} 
    disabled={isLoading}
    className={`flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${className}`}
  >
    {isLoading ? "CARREGANDO..." : (
      <>
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </>
    )}
  </button>
);