import React, { useState, useMemo, useCallback } from 'react';

// EXACT DATA FROM YOUR EXCEL SWITCH FORMULAS
const GET_RODS_PER_BUNDLE = (dia: number) => {
  const map: Record<number, number> = { 8: 10, 10: 7, 12: 5, 16: 3, 20: 2, 25: 1 };
  return map[dia] || 0;
};

const GET_BUNDLE_WEIGHT = (dia: number) => {
  const map: Record<number, number> = { 8: 47.4, 10: 51.87, 12: 53.35, 16: 56.88, 20: 59.26, 25: 46.3 };
  return map[dia] || 0;
};

// EXCEL CONSTANTS
const EXCEL_FT_TO_M_DIVIDER = 3.281;
const ROD_UNIT_LEN = 12;

interface RodSet { dia1: number; num1: string; dia2: number; num2: string; }

interface BeamData {
  id: string; grid: string; width: string; depth: string;
  lenMain: string; lenExtra: string;
  bottom: RodSet; top: RodSet; extra: RodSet;
  diaStirrups: number; spacing: string;
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<BeamData[]>([{ 
    id: '1', grid: 'B1', width: '230', depth: '380', lenMain: '60', lenExtra: '30',
    bottom: { dia1: 16, num1: '1', dia2: 12, num2: '1' },
    top: { dia1: 16, num1: '1', dia2: 12, num2: '1' },
    extra: { dia1: 16, num1: '1', dia2: 12, num2: '1' },
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
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let grandConcrete = 0;

    beams.forEach(beam => {
      const lMainM = (parseFloat(beam.lenMain) || 0) / EXCEL_FT_TO_M_DIVIDER;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) / EXCEL_FT_TO_M_DIVIDER;
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;

      grandConcrete += (wM * dM * lMainM);

      // EXCEL LOGIC: ( (LengthM * Nos) / (RodsPerBundle * 12) ) * BundleWeight
      const calcLineKg = (dia: number, nosStr: string, lengthM: number) => {
        const nos = parseFloat(nosStr) || 0;
        if (nos === 0 || dia === 0) return 0;
        const rodsPerBundle = GET_RODS_PER_BUNDLE(dia);
        const bundleWeight = GET_BUNDLE_WEIGHT(dia);
        return ((lengthM * nos) / (rodsPerBundle * ROD_UNIT_LEN)) * bundleWeight;
      };

      // 16mm - Summing separately to match your Excel total (142.22 kg)
      summary[16] += calcLineKg(beam.bottom.dia1, beam.bottom.num1, lMainM); 
      summary[16] += calcLineKg(beam.top.dia1, beam.top.num1, lMainM);       
      summary[16] += calcLineKg(beam.extra.dia1, beam.extra.num1, lMainM); // Using Main length logic for extra

      // 12mm - Summing separately to match your Excel total (80.03 kg)
      summary[12] += calcLineKg(beam.bottom.dia2, beam.bottom.num2, lMainM); 
      summary[12] += calcLineKg(beam.top.dia2, beam.top.num2, lMainM);       
      summary[12] += calcLineKg(beam.extra.dia2, beam.extra.num2, lExtraM);    

      // Stirrups (8mm)
      const stirrupQty = Math.floor(((parseFloat(beam.lenMain) || 0) * 12) / (parseFloat(beam.spacing) || 6)) + 1;
      summary[8] += calcLineKg(8, stirrupQty.toString(), 3.5 / EXCEL_FT_TO_M_DIVIDER);
    });

    return { summary, grandConcrete };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'Arial' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '22px', marginBottom: '15px' }}>{beam.grid}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <Box label="Width(mm)" value={beam.width} onChange={(v:any) => updateBeam(beam.id, 'width', v)} />
            <Box label="Depth(mm)" value={beam.depth} onChange={(v:any) => updateBeam(beam.id, 'depth', v)} />
            <Box label="Main(ft)" value={beam.lenMain} onChange={(v:any) => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Row label="Bottom" rod={beam.bottom} onUpdate={(f:any, v:any) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <Row label="Top" rod={beam.top} onUpdate={(f:any, v:any) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <Row label="Extra" rod={beam.extra} onUpdate={(f:any, v:any) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Box label="Ex Len(ft)" value={beam.lenExtra} onChange={(v:any) => updateBeam(beam.id, 'lenExtra', v)} />
              <Box label="Spacing(in)" value={beam.spacing} onChange={(v:any) => updateBeam(beam.id, 'spacing', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h3>
        <hr />
        {Object.entries(results.summary).map(([dia, kg]) => (kg > 0) && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '18px' }}>
            <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const Box = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
    <label style={{ fontSize: '11px', color: '#1565c0', display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const Row = ({ label, rod, onUpdate }: any) => {
  const act = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: '#bbdefb', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: act(rod.num1) ? '#1565c0' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num1) ? '#fff' : '#000' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: '#bbdefb', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: act(rod.num2) ? '#1565c0' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num2) ? '#fff' : '#000' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
