import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// EXACT EXCEL BUNDLE WEIGHTS
const EXCEL_BUNDLE_WEIGHTS: Record<number, number> = {
  8: 47.4,   // 8mm bundle
  10: 51.87, // 10mm bundle
  12: 53.35, // 12mm bundle
  16: 56.88, // 16mm bundle
  20: 59.26, // 20mm bundle
  25: 46.3   // 25mm bundle
};

const ROD_LEN_M = 12; // Standard rod length in meters

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

  // FIXED: Changed 'child' to 'c' to match the destructured variable name
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
    let grandVol = 0;

    const detailed = beams.map(beam => {
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * 0.3048;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * 0.3048;
      const spacingIn = parseFloat(beam.spacing) || 6;

      // Concrete Logic: Width * (Depth - 125mm) * Length
      const vol = wM * (dM - 0.125) * lMainM;
      grandVol += vol;

      // Excel Bundle Logic: (Total Meters / 12) * Bundle Weight
      const getExcelKg = (dia: number, nos: string, lengthM: number) => {
        const totalM = lengthM * (parseFloat(nos) || 0);
        const bundles = totalM / ROD_LEN_M;
        const kg = bundles * (EXCEL_BUNDLE_WEIGHTS[dia] || 0);
        summary[dia] += kg;
        return kg;
      };

      const b1 = getExcelKg(beam.bottom.dia1, beam.bottom.num1, lMainM);
      const b2 = getExcelKg(beam.bottom.dia2, beam.bottom.num2, lMainM);
      const t1 = getExcelKg(beam.top.dia1, beam.top.num1, lMainM);
      const t2 = getExcelKg(beam.top.dia2, beam.top.num2, lMainM);
      const e1 = getExcelKg(beam.extra.dia1, beam.extra.num1, lExtraM);
      const e2 = getExcelKg(beam.extra.dia2, beam.extra.num2, lExtraM);

      // Stirrups matching Excel Cell AY6
      const stirrupCutM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const stirrupQty = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / spacingIn) + 1;
      const stirrupTotalM = stirrupCutM * stirrupQty;
      const stirrupKg = (stirrupTotalM / ROD_LEN_M) * EXCEL_BUNDLE_WEIGHTS[beam.diaStirrups];
      summary[beam.diaStirrups] += stirrupKg;

      return { ...beam, vol, totalBeamKg: b1+b2+t1+t2+e1+e2+stirrupKg };
    });

    return { detailed, summary, grandVol };
  }, [beams]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("BEAM BBS - EXCEL SYNCED REPORT", 105, 15, { align: "center" });
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Width', 'Depth', 'Main Len', 'Vol (m3)', 'Total Steel']],
      body: results.detailed.map(b => [b.grid, b.width, b.depth, b.lenMain, b.vol.toFixed(3), b.totalBeamKg.toFixed(2)]),
    });
    doc.save("Beam_BBS_Report.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS CODING</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ fontWeight: 'bold', border: 'none', color: '#1565c0', fontSize: '18px' }} />
            <button onClick={() => deleteBeam(beam.id)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '50%', width: '25px', height: '25px' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <Input label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <Input label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <Input label="Main Len(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RodRow label="Bottom" rod={beam.bottom} onUpdate={(f,v) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <RodRow label="Top" rod={beam.top} onUpdate={(f,v) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <RodRow label="Extra" rod={beam.extra} onUpdate={(f,v) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Input label="Ex Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
              <Input label="Stirrup Dia" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={addBeam} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>+ ADD BEAM</button>
        <button onClick={downloadPDF} style={{ flex: 1, padding: '15px', backgroundColor: '#212121', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>DOWNLOAD PDF</button>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>PROJECT TOTALS</h3>
        <p>Total Concrete: <strong>{results.grandVol.toFixed(3)} m³</strong></p>
        {Object.entries(results.summary).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
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
  const active = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '8px', borderRadius: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num1) ? '#fff' : '#000' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: active(rod.num2) ? '#fff' : '#000' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
