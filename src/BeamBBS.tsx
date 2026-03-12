import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// EXACT BUNDLE WEIGHTS FROM YOUR EXCEL SHEET
const BUNDLE_WT: Record<number, number> = {
  8: 47.4,   // Matches your 45.9 KG result
  10: 51.87,
  12: 53.35, // Matches your 103 KG result
  16: 56.88, // Matches your 195.99 KG result
  20: 59.26,
  25: 46.3
};

const ROD_LEN = 12; // 12 meters per rod bundle unit

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
      lenMain: '55.25', lenExtra: '26.7',
      bottom: { dia1: 16, num1: '3', dia2: 12, num2: '1' },
      top: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
      extra: { dia1: 16, num1: '1', dia2: 12, num2: '0' },
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
    // CRITICAL: We start with a clean 0 every single time to prevent high numbers
    const totals: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let grandConcrete = 0;

    const detailed = beams.map(beam => {
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * 0.3048;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * 0.3048;
      const sIn = parseFloat(beam.spacing) || 6;

      // Concrete: Width * (Depth - 125mm) * MainLength
      const vol = wM * (dM - 0.125) * lMainM;
      grandConcrete += vol;

      // Excel Formula: (Length * Nos / 12) * BundleWeight
      const getKg = (dia: number, nos: string, length: number) => {
        const totalM = (parseFloat(nos) || 0) * length;
        const kg = (totalM / ROD_LEN) * (BUNDLE_WT[dia] || 0);
        return kg;
      };

      const b1 = getKg(beam.bottom.dia1, beam.bottom.num1, lMainM);
      const b2 = getKg(beam.bottom.dia2, beam.bottom.num2, lMainM);
      const t1 = getKg(beam.top.dia1, beam.top.num1, lMainM);
      const t2 = getKg(beam.top.dia2, beam.top.num2, lMainM);
      const e1 = getKg(beam.extra.dia1, beam.extra.num1, lExtraM);
      const e2 = getKg(beam.extra.dia2, beam.extra.num2, lExtraM);

      // Stirrup Formula matching Excel Cell AY6
      const stirrupCutM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const qty = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / sIn) + 1;
      const sKg = ((stirrupCutM * qty) / ROD_LEN) * BUNDLE_WT[beam.diaStirrups];

      // Add to summary
      totals[beam.bottom.dia1] += b1;
      totals[beam.bottom.dia2] += b2;
      totals[beam.top.dia1] += t1;
      totals[beam.top.dia2] += t2;
      totals[beam.extra.dia1] += e1;
      totals[beam.extra.dia2] += e2;
      totals[beam.diaStirrups] += sKg;

      return { ...beam, vol, beamTotalKg: b1+b2+t1+t2+e1+e2+sKg };
    });

    return { detailed, totals, grandConcrete };
  }, [beams]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("BEAM BBS REPORT (EXCEL MATCH)", 105, 15, { align: "center" });
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Width', 'Depth', 'Main Len', 'Concrete', 'Total Steel']],
      body: results.detailed.map(b => [b.grid, b.width, b.depth, b.lenMain, b.vol.toFixed(3), b.beamTotalKg.toFixed(2)]),
    });
    doc.save("Beam_BBS.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS CODING</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px', marginBottom: '15px', border: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ fontWeight: 'bold', border: 'none', color: '#1565c0', fontSize: '18px' }} />
            <button onClick={() => deleteBeam(beam.id)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
            <Input label="Width" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <Input label="Depth" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <Input label="Main(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <RodRow label="Bottom" rod={beam.bottom} onUpdate={(f,v) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <RodRow label="Top" rod={beam.top} onUpdate={(f,v) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <RodRow label="Extra" rod={beam.extra} onUpdate={(f,v) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <Input label="Ex Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
               <Input label="Stirrup" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={addBeam} style={{ flex: 1, padding: '12px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ ADD BEAM</button>
        <button onClick={downloadPDF} style={{ flex: 1, padding: '12px', backgroundColor: '#212121', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>DOWNLOAD PDF</button>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '10px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>PROJECT TOTALS</h3>
        <p>Total Concrete: <strong>{results.grandConcrete.toFixed(3)} m³</strong></p>
        {Object.entries(results.totals).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '5px 0' }}>
            <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '5px', borderRadius: '6px' }}>
    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#1565c0' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RodRow = ({ label, rod, onUpdate }: any) => {
  const active = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '5px', borderRadius: '6px' }}>
      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num1) ? '#fff' : '#000' }} />
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num2) ? '#fff' : '#000' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
