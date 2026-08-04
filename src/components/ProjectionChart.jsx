import React from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { Card } from './UI';

export default function ProjectionChart({ data, isActive, initialCapital, targetGoal }) {
  
  const cleanCurrency = (val) => {
    if (!val || val === '--') return 0;
    return parseFloat(String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  };

 const chartMixData = React.useMemo(() => {
    if (!isActive || !Array.isArray(data) || data.length === 0) return [];

    // 1. ORDENAR: Garante que as operações estão do mais antigo para o mais novo
// --- COLOQUE O CÓDIGO AQUI ---
  const parseDataParaSort = (dataStr) => {
    if (!dataStr) return 0;
    const [data, hora] = dataStr.split(' ');
    const [dia, mes] = data.split('/');
    
    // 🛡️ CORREÇÃO: Se "hora" não existir (undefined), assume '00:00' para não quebrar o split
    const safeHora = hora || '00:00'; 
    const [h, m] = safeHora.split(':');
    
    return new Date(2026, (mes || 1) - 1, (dia || 1), h || 0, m || 0).getTime();
  };
    const sortedOps = [...data].sort((a, b) => {
    return parseDataParaSort(a.start) - parseDataParaSort(b.start);
  });
    // 2. CALCULAR SALDO: Agora calculamos o runningBalance corretamente
    let runningBalance = initialCapital;
  const pontosReais = sortedOps.map((op) => { // <-- Note que mudamos de 'data' para 'sortedOps'
    const resultVal = cleanCurrency(op.result);
      // Ajuste: se for 'loss', subtrai.
      const ajuste = op.status.toLowerCase() === 'loss' ? -Math.abs(resultVal) : Math.abs(resultVal);
      runningBalance += ajuste; 
      
      return {
        name: op.asset || 'Op',
        valor: parseFloat(runningBalance.toFixed(2))
      };
    });

    const totalPontosReais = pontosReais.length;
    const capitalAtual = pontosReais[totalPontosReais - 1].valor;
    const ganhoMedioPorOp = totalPontosReais > 0 ? (capitalAtual - initialCapital) / totalPontosReais : 0;
    
    const totalPassosCiclo = Math.max(15, totalPontosReais + 8);
    const mix = [];
    const volumeMedioReal = 1500; 

    for (let i = 0; i < totalPassosCiclo; i++) {
      let labelName = `Op ${i}`;
      let saldoReal = undefined;
      let saldoTendencia = undefined;
      // Cálculo preciso da meta linear
      let linhaMetaGuia = initialCapital + (i * ((targetGoal - initialCapital) / totalPassosCiclo));
      let volReal = 0;
      let volProjetado = 0;

      if (i < totalPontosReais) {
        const ponto = pontosReais[i];
        labelName = ponto.name;
        saldoReal = ponto.valor;
        saldoTendencia = ponto.valor;
        volReal = Math.round(volumeMedioReal * (0.8 + Math.random() * 0.4));
      } else {
        labelName = `Proj ${i - totalPontosReais + 1}`;
        const passosFuturos = i - totalPontosReais + 1;
        saldoTendencia = parseFloat((capitalAtual + (passosFuturos * ganhoMedioPorOp)).toFixed(2));
        volProjetado = Math.round(volumeMedioReal * 0.9);
      }

      mix.push({
        name: labelName,
        "Capital Real": saldoReal,
        "Tendência": saldoTendencia,
        "Meta": parseFloat(linhaMetaGuia.toFixed(2)),
        "Volume": volReal,
        "Proj. Vol": volProjetado
      });
    }

    return mix;
  }, [data, isActive, initialCapital, targetGoal]);

  const formatCurrency = (value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Card className="h-[26rem] bg-slate-900/20 border-slate-800 p-6 mb-12 overflow-hidden relative">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={isActive ? chartMixData : []} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
             <XAxis dataKey="name" tick={{fill: '#475569', fontSize: 9}} />
             <YAxis yAxisId="left" orientation="right" tickFormatter={(v) => `R$ ${v}`} tick={{fill: '#475569', fontSize: 9}} />
             
             <Tooltip 
               contentStyle={{ backgroundColor: '#ffffff', color: '#000', borderRadius: '8px', fontSize: '12px', padding: '10px' }}
               formatter={(value, name) => {
                 // 🛡️ CORREÇÃO: Chave exata "Volume" como definida no mix.push
                 if (name === "Volume" || name === "Proj. Vol") return [Number(value).toLocaleString('pt-BR'), name];
                 return [formatCurrency(value), name];
               }}
             />
             
             <Bar yAxisId="left" dataKey="Volume" fill="#334155" />
             <Area type="monotone" yAxisId="left" dataKey="Capital Real" stroke="#3b82f6" fill="url(#colorReal)" />
             <Line type="monotone" yAxisId="left" dataKey="Tendência" stroke="#10b981" />
             <Line type="monotone" yAxisId="left" dataKey="Meta" stroke="#a855f7" strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}