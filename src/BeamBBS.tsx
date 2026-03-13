import React, { useState, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- DATA FROM YOUR EXCEL SWITCH FORMULAS (Verified from Columns P-U and V-AA) ---
const BUNDLE_DATA: Record<number, { weight: number; rods: number }> = {
  8:  { weight: 47.4,  rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.3,  rods: 1 }
};

const DIVIDER = 3.281; // Feet to Meters (Column M, N, O logic)
const ROD_LEN = 12;    // Rod Length constant

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
      id, grid: `B${id}`, w: '230', d: '380', mainFt: '60', exFt: '30', spacing: '6',
      bottom1: { dia: 16, nos: '1' }, bottom2: { dia: 12, nos: '1' },
      top1: { dia: 16, nos: '1' }, top2: { dia: 12, nos: '1' },
      ex1: { dia: 16, nos: '1' }, ex2: { dia: 12, nos: '1' }
    };
  }

  const addBeam = () => setBeams([...beams, createEmptyBeam(Date.now())]);
  const deleteBeam = (id: number) => setBeams(beams.filter(b => b.id !== id));

  const updateBeam = useCallback((id: number, path: string, val: string) => {
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
  }, []);

  // --- ENGINE: CALCULATES EVERY EXCEL COLUMN M THROUGH AM ---
  const beamResults = useMemo(() => {
    return beams.map(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / DIVIDER; // Col M, N
      const L_Ex = (parseFloat(b.exFt) || 0) / DIVIDER;     // Col O

      const getRowCalc = (entry: RodEntry, len: number) => {
        const nos = parseFloat(entry.nos) || 0;
        const config = BUNDLE_DATA[entry.dia];
        if (!config || nos === 0) return { bundles: 0, kg: 0 };
        
        // AB-AG: Required Bundles = (Meters * Nos) / (RodsPerBundle * 12)
        const bundles = (len * nos) / (config.rods * ROD_LEN);
        // AH-AM: KG = Bundles * BundleWeight
        const kg = bundles * config.weight;
        return { bundles, kg };
      };

      return {
        ...b,
        calcs: {
          b1: getRowCalc(b.bottom1, L_Main),
          b2: getRowCalc(b.bottom2, L_Main),
          t1: getRowCalc(b.top1, L_Main),
          t2: getRowCalc(b.top2, L_Main),
          e1: getRowCalc(b.ex1, L_Main),
          e2: getRowCalc(b.ex2, L_Ex),
          stirrups: getRowCalc({ dia: 8, nos: (Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1).toString() }, 3.5 / DIVIDER)
        }
      };
    });
  }, [beams]);

  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    beamResults.forEach(br => {
      [br.bottom1, br.bottom2, br.top1, br.top2, br.ex1, br.ex2].forEach((entry, i) => {
        const key = ['b1', 'b2', 't1', 't2', 'e1', 'e2'][i];
        summary[entry.dia] += (br.calcs as any)[key].kg;
      });
      summary[8] += br.calcs.stirrups.kg;
    });
    return summary;
  }, [beamResults]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', paddingBottom: '40px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: 'white', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
        BEAM BBS PROFESSIONAL ESTIMATOR
      </header>

      <div style={{ padding: '15px' }}>
        {beamResults.map((b) => (
          <div key={b.id} style={{ backgroundColor: 'white', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              <span style={{ color: '#1565c0', fontWeight: 'bold', fontSize: '18px' }}>{b.grid} Details</span>
              <button onClick={() => deleteBeam(b.id)} style={{ color: '#d32f2f', background: 'none', border: 'none', fontWeight: 'bold' }}>DELETE</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              <Box label="Width" val={b.w} set={(v:any) => updateBeam(b.id, 'w', v)} />
              <Box label="Depth" val={b.d} set={(v:any) => updateBeam(b.id, 'd', v)} />
              <Box label="Main(ft)" val={b.mainFt} set={(v:any) => updateBeam(b.id, 'mainFt', v)} />
            </div>

            <Section label="Bottom" entry1={b.bottom1} entry2={b.bottom2} set1={(f:any, v:any) => updateBeam(b.id, `bottom1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `bottom2.${f}`, v)} />
            <Section label="Top" entry1={b.top1} entry2={b.top2} set1={(f:any, v:any) => updateBeam(b.id, `top1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `top2.${f}`, v)} />
            <Section label="Extra" entry1={b.ex1} entry2={b.ex2} set1={(f:any, v:any) => updateBeam(b.id, `ex1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `ex2.${f}`, v)} />

            {/* --- EXCEL COLUMN STAGE VIEW --- */}
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '10px', fontSize: '11px', border: '1px solid #ddd' }}>
              <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>EXCEL CALCULATION STAGES (AB-AM):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>16mm Bundles: {(b.calcs.b1.bundles + b.calcs.t1.bundles + b.calcs.e1.bundles).toFixed(5)}</div>
                <div>16mm KG: {(b.calcs.b1.kg + b.calcs.t1.kg + b.calcs.e1.kg).toFixed(2)}</div>
                <div>12mm Bundles: {(b.calcs.b2.bundles + b.calcs.t2.bundles + b.calcs.e2.bundles).toFixed(5)}</div>
                <div>12mm KG: {(b.calcs.b2.kg + b.calcs.t2.kg + b.calcs.e2.kg).toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addBeam} style={{ width: '100%', padding: '15px', background: 'white', border: '2px dashed #1565c0', color: '#1565c0', borderRadius: '12px', fontWeight: 'bold', marginBottom: '25px' }}>+ ADD NEW BEAM</button>

        <div style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '20px', border: '2px solid #1565c0' }}>
          <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#1565c0' }}>FINAL PROJECT TOTALS</h3>
          {Object.entries(totals).map(([dia, kg]) => (kg > 0) && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f0f0f0', fontSize: '18px' }}>
              <span>{dia}mm Reinforcement:</span> <strong>{kg.toFixed(2)} KG</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Box = ({ label, val, set }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={val} onChange={(e) => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Section = ({ label, entry1, entry2, set1, set2 }: any) => (
  <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>{label}</div>
    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
      <input type="number" value={entry1.dia} onChange={e => set1('dia', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
      <input type="number" value={entry1.nos} onChange={e => set1('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#1565c0', color: 'white', textAlign: 'center' }} />
    </div>
    <div style={{ display: 'flex', gap: '5px' }}>
      <input type="number" value={entry2.dia} onChange={e => set2('dia', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
      <input type="number" value={entry2.nos} onChange={e => set2('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#1565c0', color: 'white', textAlign: 'center' }} />
    </div>
  </div>
);

export default BeamBBS;
