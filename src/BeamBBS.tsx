import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// EXACT DATA FROM YOUR REFERENCE SHEET
const EXCEL_REF: Record<number, { weight: number; rods: number }> = {
  8: { weight: 47.4, rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 60.00, rods: 1 }
};

const FT_TO_M = 0.3048;
const ROD_UNIT_M = 12;

interface RodSet { dia1: number; num1: string; dia2: number; num2: string; }

interface BeamData {
  id: string; grid: string; width: string; depth: string;
  lenMain: string; lenExtra: string;
  bottom: RodSet; top: RodSet; extra: RodSet;
  diaStirrups: number; spacing: string;
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<BeamData[]>([{ 
    id: '1', grid: 'B1', width: '230', depth: '380', lenMain: '55.25', lenExtra: '26.7',
    bottom: { dia1: 16, num1: '3', dia2: 12, num2: '1' },
    top: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
    extra: { dia1: 16, num1: '1', dia2: 12, num2: '0' },
    diaStirrups: 8, spacing: '6' 
  }]);

  const updateBeam = useCallback((id: string, field: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (field.includes('.')) {
        const [p, c] = field.split('.');
        return { ...b, [p]: { ...(b as any)[p], [c]: val } };
      }
      return { ...b, [field]: val };
    }));
  }, []);

  const results = useMemo(() => {
    // Resetting everything to 0 to prevent the "High KG" error
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let totalVol = 0;

    const detailed = beams.map(beam => {
      const L_Main_M = (parseFloat(beam.lenMain) || 0) * FT_TO_M;
      const L_Extra_M = (parseFloat(beam.lenExtra) || 0) * FT_TO_M;
      const W_M = (parseFloat(beam.width) || 0) / 1000;
      const D_M = (parseFloat(beam.depth) || 0) / 1000;

      // Concrete: W * (D - 125mm) * L_Main
      const vol = W_M * (D_M - 0.125) * L_Main_M;
      totalVol += vol;

      // Excel Logic: KG = (Length * Nos / (RodsPerBundle * 12)) * BundleWeight
      const calc = (dia: number, nos: string, len: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0) return 0;
        const ref = EXCEL_REF[dia];
        const kg = ((len * n) / (ref.rods * ROD_UNIT_M)) * ref.weight;
        summary[dia] += kg;
        return kg;
      };

      const bKg = calc(beam.bottom.dia1, beam.bottom.num1, L_Main_M) + calc(beam.bottom.dia2, beam.bottom.num2, L_Main_M);
      const tKg = calc(beam.top.dia1, beam.top.num1, L_Main_M) + calc(beam.top.dia2, beam.top.num2, L_Main_M);
      const eKg = calc(beam.extra.dia1, beam.extra.num1, L_Extra_M) + calc(beam.extra.dia2, beam.extra.num2, L_Extra_M);

      // Stirrups (Cell AY6): ((CuttingLen * Qty) / (10 * 12)) * 47.4
      const cutM = (((W_M * 1000 - 80) * 2) + ((D_M * 1000 - 80) * 2) + 200) / 1000;
      const qty = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / (parseFloat(beam.spacing) || 6)) + 1;
      const sKg = ((cutM * qty) / (EXCEL_REF[beam.diaStirrups].rods * ROD_UNIT_M)) * EXCEL_REF[beam.diaStirrups].weight;
      summary[beam.diaStirrups] += sKg;

      return { ...beam, vol, beamTotal: bKg + tKg + eKg + sKg };
    });

    return { detailed, summary, totalVol };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS CODING</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ fontWeight: 'bold', border: 'none', color: '#1565c0', fontSize: '20px', width: '100px' }} />
            <button onClick={() => setBeams(beams.filter(b => b.id !== beam.id))} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <Input label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <Input label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <Input label="Main Len(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RodRow label="Bottom" rod={beam.bottom} onUpdate={(f, v) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <RodRow label="Top" rod={beam.top} onUpdate={(f, v) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <RodRow label="Extra" rod={beam.extra} onUpdate={(f, v) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Input label="Ex Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
              <Input label="Spacing(in)" value={beam.spacing} onChange={v => updateBeam(beam.id, 'spacing', v)} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={() => setBeams([...beams, { ...beams[0], id: Date.now().toString(), grid: `B${beams.length + 1}` }])} style={{ width: '100%', padding: '15px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '20px' }}>+ ADD BEAM</button>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <span>Total Concrete:</span> <strong>{results.totalVol.toFixed(3)} m³</strong>
        </div>
        {Object.entries(results.summary).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', display: 'block', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RodRow = ({ label, rod, onUpdate }: any) => {
  const act = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '8px', borderRadius: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: act(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '5px' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: act(rod.num1) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num1) ? '#fff' : '#000', padding: '5px' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: act(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '5px' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: act(rod.num2) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num2) ? '#fff' : '#000', padding: '5px' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
