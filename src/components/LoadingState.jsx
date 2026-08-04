import React from 'react';

const LoadingState = () => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-white w-full max-w-4xl mx-auto shadow-2xl animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="space-y-2">
          <div className="h-5 w-64 bg-slate-800 rounded"></div>
          <div className="h-3 w-32 bg-slate-900 rounded"></div>
        </div>
        <div className="h-6 w-24 bg-slate-800 rounded-full"></div>
      </div>

      {/* Grid de Performance Ajustado */}
      <div className="mb-6 space-y-4">
        {/* Linha superior: 3 cards de skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 h-16 rounded-lg border border-slate-800"></div>
          ))}
        </div>
        {/* Linha inferior: Card grande de skeleton */}
        <div className="bg-slate-900 h-24 rounded-lg border border-slate-800"></div>
      </div>

      {/* Análise Técnica Skeleton */}
      <div className="mb-6">
        <div className="h-3 w-24 bg-slate-800 rounded mb-2"></div>
        <div className="h-24 bg-slate-900/50 rounded-lg border border-slate-800"></div>
      </div>

      {/* Pontos Fortes e Riscos Skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-slate-800 rounded"></div>
          <div className="h-16 bg-slate-900 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 bg-slate-800 rounded"></div>
          <div className="h-16 bg-slate-900 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;