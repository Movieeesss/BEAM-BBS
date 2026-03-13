import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- DATA FROM YOUR EXCEL ---
const BUNDLE_DATA: Record<number, { weight: number; rods: number }> = {
  8:  { weight: 47.4,  rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.3,  rods: 1 }
};

const DIVIDER = 3.281; 
const ROD_LEN = 12;    

interface RodEntry { dia: number; nos: string; }
interface Beam {
  id: number; grid: string; w: string; d: string; mainFt: string; exFt: string; spacing: string;
  bottom1: RodEntry; bottom2: RodEntry;
  top1: RodEntry; top2: RodEntry;
  ex1: RodEntry; ex2: RodEntry;
}

const BeamBBS = () => {
  const [beams, setBeams] = useState<Beam[]>([createEmptyBeam(1)]);

  function createEmptyBeam(id: number): Beam {
    return {
      id: Date.now(), grid: `B1`, w: '230', d: '380', mainFt: '60', exFt: '30', spacing: '6',
      bottom1: { dia: 16, nos: '1' }, bottom2: { dia: 12, nos: '1' },
      top1: { dia: 16, nos: '1' }, top2: { dia: 12, nos: '1' },
      ex1: { dia: 16, nos: '1' }, ex2: { dia: 12, nos: '1' }
    };
  }

  const updateBeam = (id: number, path: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b };
      if (path.includes('.')) {
        const [p, c] = path.split('.');
        (newB as any)[p] = { ...(newB as any)[p], [c]: val };
      } else {
        (newB as any)[path] = val;
      }
      return newB;
    }));
  };

  // --- CALCULATION ENGINE WITH 6-ZONE SEPARATION ---
  const results = useMemo(() => {
    const totalSummary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    
    const beamDetails = beams.map(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / DIVIDER;
      const L_Ex = (parseFloat(b.exFt) || 0) / DIVIDER;

      const calcKg = (dia: number, nos: string, lenM: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !BUNDLE_DATA[dia]) return 0;
        const config = BUNDLE_DATA[dia];
        return ((lenM * n) / (config.rods * ROD_LEN)) * config.weight;
      };

      // 1. Calculate 6 Zones Independently
      const z1 = calcKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      const z2 = calcKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      const z3 = calcKg(b.top1.dia, b.top1.nos, L_Main);
      const z4 = calcKg(b.top2.dia, b.top2.nos, L_Main);
      const z5 = calcKg(b.ex1.dia, b.ex1.nos, L_Main);
      const z6 = calcKg(b.ex2.dia, b.ex2.nos, L_Ex);

      // 2. Add to totals by Diameter
      totalSummary[b.bottom1.dia] += z1;
      totalSummary[b.bottom2.dia] += z2;
      totalSummary[b.top1.dia]    += z3;
      totalSummary[b.top2.dia]    += z4;
      totalSummary[b.ex1.dia]     += z5;
      totalSummary[b.ex2.dia]     += z6;

      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      const stirrupKg = calcKg(8, stirrupQty.toString(), 3.5 / DIVIDER);
      totalSummary[8] += stirrupKg;

      return { ...b, z1, z2, z3, z4, z5, z6, stirrupKg };
    });

    return { beamDetails, totalSummary };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'Arial' }}>
      <div style={{ backgroundColor: '#1565c0', color: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '15px' }}>BEAM BBS - PROFESSIONAL</div>
      
      {results.beamDetails.map(b => (
        <div key={b.id} style={{ backgroundColor: 'white', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
             <Input label="W(mm)" val={b.w} set={v => updateBeam(b.id, 'w', v)} />
             <Input label="D(mm)" val={b.d} set={v => updateBeam(b.id, 'd', v)} />
             <Input label="Main(ft)" val={b.mainFt} set={v => updateBeam(b.id, 'mainFt', v)} />
          </div>

          <Section label="Bottom" entry1={b.bottom1} entry2={b.bottom2} set1={(f, v) => updateBeam(b.id, `bottom1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `bottom2.${f}`, v)} />
          <Section label="Top" entry1={b.top1} entry2={b.top2} set1={(f, v) => updateBeam(b.id, `top1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `top2.${f}`, v)} />
          <Section label="Extra" entry1={b.ex1} entry2={b.ex2} set1={(f, v) => updateBeam(b.id, `ex1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `ex2.${f}`, v)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
             <Input label="Ex Len(ft)" val={b.exFt} set={v => updateBeam(b.id, 'exFt', v)} />
             <Input label="Spacing(in)" val={b.spacing} set={v => updateBeam(b.id, 'spacing', v)} />
          </div>

          <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '10px', fontSize: '11px', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1565c0' }}>INDIVIDUAL ZONE TOTALS (KG):</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              <span>Btm: {b.z1.toFixed(2)} | {b.z2.toFixed(2)}</span>
              <span>Top: {b.z3.toFixed(2)} | {b.z4.toFixed(2)}</span>
              <span>Extra: {b.z5.toFixed(2)} | {b.z6.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}

      <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', border: '2px solid #1565c0', marginTop: '20px' }}>
         <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h3>
         {Object.entries(results.totalSummary).map(([dia, kg]) => (kg > 0) && (
           <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '18px' }}>
             <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
           </div>
         ))}
      </div>
    </div>
  );
};

const Input = ({ label, val, set }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Section = ({ label, entry1, entry2, set1, set2 }: any) => {
  const dias = [8, 10, 12, 16, 20, 25];
  return (
    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
        <select value={entry1.dia} onChange={e => set1('dia', parseInt(e.target.value))} style={{ width: '50%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
          {dias.map(d => <option key={d} value={d}>{d}mm</option>)}
        </select>
        <input type="number" value={entry1.nos} onChange={e => set1('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '5px', backgroundColor: '#1565c0', color: 'white', border: 'none', textAlign: 'center' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px' }}>
        <select value={entry2.dia} onChange={e => set2('dia', parseInt(e.target.value))} style={{ width: '50%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
          {dias.map(d => <option key={d} value={d}>{d}mm</option>)}
        </select>
        <input type="number" value={entry2.nos} onChange={e => set2('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '5px', backgroundColor: '#1565c0', color: 'white', border: 'none', textAlign: 'center' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
