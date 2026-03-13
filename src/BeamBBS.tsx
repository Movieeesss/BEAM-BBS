import React, { useState, useMemo, useCallback } from 'react';

// --- DATA CONSTANTS ---
const GET_RODS_PER_BUNDLE = (dia: number) => {
  const map: Record<number, number> = { 8: 10, 10: 7, 12: 5, 16: 3, 20: 2, 25: 1 };
  return map[dia] || 0;
};

const GET_BUNDLE_WEIGHT = (dia: number) => {
  const map: Record<number, number> = { 8: 47.4, 10: 51.87, 12: 53.35, 16: 56.88, 20: 59.26, 25: 46.3 };
  return map[dia] || 0;
};

const FT_TO_M = 3.281;
const ROD_LEN = 12;

interface Beam {
  id: string; grid: string; width: string; depth: string; mainFt: string; exFt: string; spacingIn: string;
  bottom: { d1: number; n1: string; d2: number; n2: string };
  top: { d1: number; n1: string; d2: number; n2: string };
  extra: { d1: number; n1: string; d2: number; n2: string };
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<Beam[]>([{
    id: '1', grid: 'B1', width: '230', depth: '380', mainFt: '60', exFt: '30', spacingIn: '6',
    bottom: { d1: 16, n1: '1', d2: 12, n2: '1' },
    top: { d1: 16, n1: '1', d2: 12, n2: '1' },
    extra: { d1: 16, n1: '1', d2: 12, n2: '1' }
  }]);

  const update = (id: string, path: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        return { ...b, [parent]: { ...(b as any)[parent], [child]: val } };
      }
      return { ...b, [path]: val };
    }));
  };

  const totals = useMemo(() => {
    const sum: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let concrete = 0;

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / FT_TO_M;
      const L_Ex = (parseFloat(b.exFt) || 0) / FT_TO_M;
      
      concrete += ((parseFloat(b.width) || 0)/1000 * (parseFloat(b.depth) || 0)/1000 * L_Main);

      const calc = (dia: number, nos: string, len: number) => {
        const n = parseFloat(nos) || 0;
        if (n <= 0 || dia <= 0) return 0;
        return ((len * n) / (GET_RODS_PER_BUNDLE(dia) * ROD_LEN)) * GET_BUNDLE_WEIGHT(dia);
      };

      // 1. BOTTOM BARS (Calculated on Main Length)
      sum[b.bottom.d1] += calc(b.bottom.d1, b.bottom.n1, L_Main);
      sum[b.bottom.d2] += calc(b.bottom.d2, b.bottom.n2, L_Main);

      // 2. TOP BARS (Calculated on Main Length)
      sum[b.top.d1] += calc(b.top.d1, b.top.n1, L_Main);
      sum[b.top.d2] += calc(b.top.d2, b.top.n2, L_Main);

      // 3. EXTRA BARS (Dia1 on Main, Dia2 on Extra Length to match Excel logic)
      sum[b.extra.d1] += calc(b.extra.d1, b.extra.n1, L_Main);
      sum[b.extra.d2] += calc(b.extra.d2, b.extra.n2, L_Ex);

      // 4. STIRRUPS (8mm)
      const qty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacingIn) || 6)) + 1;
      sum[8] += calc(8, qty.toString(), 3.5 / FT_TO_M); 
    });
    return { sum, concrete };
  }, [beams]);

  return (
    <div style={{ background: '#f4f7f9', minHeight: '100vh', padding: '20px', fontFamily: 'Arial' }}>
      {beams.map(b => (
        <div key={b.id} style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#1565c0', marginBottom: '15px' }}>{b.grid}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <InputBox label="Width(mm)" val={b.width} set={v => update(b.id, 'width', v)} />
            <InputBox label="Depth(mm)" val={b.depth} set={v => update(b.id, 'depth', v)} />
            <InputBox label="Main(ft)" val={b.mainFt} set={v => update(b.id, 'mainFt', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <RodRow label="Bottom" d1={b.bottom.d1} n1={b.bottom.n1} d2={b.bottom.d2} n2={b.bottom.n2} onUpdate={(f, v) => update(b.id, `bottom.${f}`, v)} />
            <RodRow label="Top" d1={b.top.d1} n1={b.top.n1} d2={b.top.d2} n2={b.top.n2} onUpdate={(f, v) => update(b.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <RodRow label="Extra" d1={b.extra.d1} n1={b.extra.n1} d2={b.extra.d2} n2={b.extra.n2} onUpdate={(f, v) => update(b.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <InputBox label="Ex Len(ft)" val={b.exFt} set={v => update(b.id, 'exFt', v)} />
              <InputBox label="Spacing(in)" val={b.spacingIn} set={v => update(b.id, 'spacingIn', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ background: '#fff', border: '2px solid #1565c0', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ textAlign: 'center', color: '#1565c0', margin: '0 0 15px 0' }}>PROJECT TOTALS</h3>
        <div style={{ fontSize: '18px', lineHeight: '2' }}>
          <div>Concrete: <strong>{totals.concrete.toFixed(3)} m³</strong></div>
          {Object.entries(totals.sum).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ borderTop: '1px solid #eee' }}>
              {dia}mm Steel: <strong style={{ float: 'right' }}>{kg.toFixed(2)} KG</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const InputBox = ({ label, val, set }: any) => (
  <div style={{ background: '#e3f2fd', padding: '8px', borderRadius: '6px' }}>
    <label style={{ fontSize: '11px', color: '#1565c0', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RodRow = ({ label, d1, n1, d2, n2, onUpdate }: any) => (
  <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>{label}</div>
    <div style={{ display: 'flex', gap: '5px' }}>
      <input type="number" value={d1} onChange={e => onUpdate('d1', e.target.value)} style={{ width: '50%', background: '#bbdefb', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
      <input type="number" value={n1} onChange={e => onUpdate('n1', e.target.value)} style={{ width: '50%', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
    </div>
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
      <input type="number" value={d2} onChange={e => onUpdate('d2', e.target.value)} style={{ width: '50%', background: '#bbdefb', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
      <input type="number" value={n2} onChange={e => onUpdate('n2', e.target.value)} style={{ width: '50%', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
    </div>
  </div>
);

export default BeamBBS;
