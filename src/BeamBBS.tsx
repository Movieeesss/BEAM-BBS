import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** * EXACT EXCEL REFERENCE DATA
 * weight: Bundle Weight (V6, W6, X6, Y6)
 * rods: Rods per Bundle (P6, Q6, R6, S6)
 */
const BUNDLE_REF: Record<number, { weight: number; rods: number }> = {
  8: { weight: 47.4, rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 60.00, rods: 1 }
};

const FT_TO_M = 0.3048;
const UNIT_LEN_M = 12;

interface RodSet {
  dia1: number; num1: string;
  dia2: number; num2: string;
}

interface BeamData {
  id: string;
  grid: string;
  width: string;
  depth: string;
  lenMain: string;
  lenExtra: string;
  bottom: RodSet;
  top: RodSet;
  extra: RodSet;
  diaStirrups: number;
  spacing: string;
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<BeamData[]>([
    { 
      id: '1', grid: 'B1', width: '230', depth: '380', 
      lenMain: '60', lenExtra: '26.7',
      bottom: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
      top: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
      extra: { dia1: 16, num1: '1', dia2: 12, num2: '1' },
      diaStirrups: 8, spacing: '6' 
    }
  ]);

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

  const addBeam = () => {
    setBeams([...beams, { ...beams[0], id: Date.now().toString(), grid: `B${beams.length + 1}` }]);
  };

  const deleteBeam = (id: string) => {
    if (beams.length > 1) setBeams(beams.filter(b => b.id !== id));
  };

  const results = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let grandConcrete = 0;

    const detailed = beams.map(beam => {
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * FT_TO_M;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * FT_TO_M;
      const sIn = parseFloat(beam.spacing) || 6;

      // Concrete: W * (D - 125mm) * L = 1.073 m3
      const vol = wM * (dM - 0.125) * lMainM;
      grandConcrete += vol;

      // EXCEL LOGIC: KG = (Total Meters / (Rods per Bundle * 12)) * Bundle Weight
      const calcKg = (dia: number, nos: string, lengthM: number) => {
        const totalM = lengthM * (parseFloat(nos) || 0);
        const ref = BUNDLE_REF[dia];
        if (!ref || totalM === 0) return 0;
        
        const bundles = totalM / (ref.rods * UNIT_LEN_M);
        const kg = bundles * ref.weight;
        summary[dia] = (summary[dia] || 0) + kg;
        return kg;
      };

      // Calculate each rebar group individually to match your AH, AI, AJ, AK columns
      const b1 = calcKg(beam.bottom.dia1, beam.bottom.num1, lMainM);
      const b2 = calcKg(beam.bottom.dia2, beam.bottom.num2, lMainM);
      const t1 = calcKg(beam.top.dia1, beam.top.num1, lMainM);
      const t2 = calcKg(beam.top.dia2, beam.top.num2, lMainM);
      const e1 = calcKg(beam.extra.dia1, beam.extra.num1, lExtraM);
      const e2 = calcKg(beam.extra.dia2, beam.extra.num2, lExtraM);

      // Stirrup Logic (Matches Column AY: 49.8 KG for 60ft)
      const cutM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const qty = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / sIn) + 1;
      const sTotalM = cutM * qty;
      const sBundles = sTotalM / (BUNDLE_REF[beam.diaStirrups].rods * UNIT_LEN_M);
      const sKg = sBundles * BUNDLE_REF[beam.diaStirrups].weight;
      summary[beam.diaStirrups] += sKg;

      return { ...beam, vol, totalBeamKg: b1+b2+t1+t2+e1+e2+sKg };
    });

    return { detailed, summary, grandConcrete };
  }, [beams]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("BEAM BBS REPORT", 105, 15, { align: "center" });
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Size', 'Length', 'Concrete', 'Total Steel']],
      body: results.detailed.map(b => [b.grid, `${b.width}x${b.depth}`, b.lenMain, b.vol.toFixed(3), b.totalBeamKg.toFixed(2)]),
    });
    doc.save("Beam_BBS.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ fontWeight: 'bold', border: 'none', color: '#1565c0', fontSize: '18px', width: '100px' }} />
            <button onClick={() => deleteBeam(beam.id)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <Box label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <Box label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <Box label="Main Len(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RodRow label="Bottom" rod={beam.bottom} onUpdate={(f,v) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <RodRow label="Top" rod={beam.top} onUpdate={(f,v) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <RodRow label="Extra" rod={beam.extra} onUpdate={(f,v) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Box label="Ex Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
              <Box label="Stirrup Spacing(in)" value={beam.spacing} onChange={v => updateBeam(beam.id, 'spacing', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={addBeam} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+ ADD BEAM</button>
        <button onClick={downloadPDF} style={{ flex: 1, padding: '15px', backgroundColor: '#212121', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>DOWNLOAD PDF</button>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>PROJECT TOTALS (EXCEL SYNC)</h3>
        <p style={{ display: 'flex', justifyContent: 'space-between' }}>Total Concrete: <strong>{results.grandConcrete.toFixed(3)} m³</strong></p>
        <hr style={{ border: '0.5px solid #eee' }} />
        {Object.entries(results.summary).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9f9f9' }}>
            <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const Box = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', display: 'block', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RodRow = ({ label, rod, onUpdate }: any) => {
  const active = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '8px', borderRadius: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#444' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num1) ? '#fff' : '#000' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num2) ? '#fff' : '#000' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
