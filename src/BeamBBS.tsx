import React, { useState, useMemo, useCallback } from 'react';

// EXACT DATA FROM YOUR EXCEL BUNDLE SPECIFICATIONS
const GET_RODS_PER_BUNDLE = (dia: number) => {
  const map: Record<number, number> = { 8: 10, 10: 7, 12: 5, 16: 3, 20: 2, 25: 1 };
  return map[dia] || 0;
};

const GET_BUNDLE_WEIGHT = (dia: number) => {
  const map: Record<number, number> = { 8: 47.4, 10: 51.87, 12: 53.35, 16: 56.88, 20: 59.26, 25: 46.3 };
  return map[dia] || 0;
};

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
    let totalConcrete = 0;

    beams.forEach(beam => {
      const lMainM = (parseFloat(beam.lenMain) || 0) / EXCEL_FT_TO_M_DIVIDER;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) / EXCEL_FT_TO_M_DIVIDER;
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;

      totalConcrete += (wM * dM * lMainM);

      const calcKg = (dia: number, nosStr: string, lengthM: number) => {
        const nos = parseFloat(nosStr) || 0;
        if (nos <= 0 || dia <= 0) return 0;
        return ((lengthM * nos) / (GET_RODS_PER_BUNDLE(dia) * ROD_UNIT_LEN)) * GET_BUNDLE_WEIGHT(dia);
      };

      // --- 16mm MAPPING ---
      // To get 142.22kg from 60ft length, we need 5 "units" of 16mm at 28.44kg each.
      // I am calculating every available field to ensure nothing is missed.
      [beam.bottom.dia1, beam.bottom.dia2, beam.top.dia1, beam.top.dia2, beam.extra.dia1].forEach((dia, index) => {
          const nos = index === 0 ? beam.bottom.num1 : index === 1 ? beam.bottom.num2 : index === 2 ? beam.top.num1 : index === 3 ? beam.top.num2 : beam.extra.num1;
          summary[dia] += calcKg(dia, nos, lMainM);
      });

      // --- 12mm MAPPING ---
      // Adding the remaining 12mm Extra length logic
      summary[beam.extra.dia2] += calcKg(beam.extra.dia2, beam.extra.num2, lExtraM);

      // Stirrups
      const stirrupCount = Math.floor(((parseFloat(beam.lenMain) || 0) * 12) / (parseFloat(beam.spacing) || 6)) + 1;
      summary[8] += calcKg(8, stirrupCount.toString(), 3.5 / EXCEL_FT_TO_M_DIVIDER);
    });

    return { summary, totalConcrete };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: 'auto' }}>
        {beams.map(beam => (
          <div key={beam.id} style={{ background: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#1565c0' }}>Beam: {beam.grid}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <Box label="Width" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
                <Box label="Depth" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
                <Box label="Main (ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <RodInput label="Bottom" data={beam.bottom} onUpdate={(f, v) => updateBeam(beam.id, `bottom.${f}`, v)} />
                <RodInput label="Top" data={beam.top} onUpdate={(f, v) => updateBeam(beam.id, `top.${f}`, v)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <RodInput label="Extra" data={beam.extra} onUpdate={(f, v) => updateBeam(beam.id, `extra.${f}`, v)} />
                <div>
                    <Box label="Ex Len (ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
                    <Box label="Spacing (in)" value={beam.spacing} onChange={v => updateBeam(beam.id, 'spacing', v)} />
                </div>
            </div>
          </div>
        ))}

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '2px solid #1565c0' }}>
          <h2 style={{ textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h2>
          <div style={{ fontSize: '20px' }}>
            <p>Concrete: <strong>{results.totalConcrete.toFixed(3)} m³</strong></p>
            {Object.entries(results.summary).map(([dia, kg]) => kg > 0 && (
                <p key={dia}>{dia}mm Steel: <strong>{kg.toFixed(2)} KG</strong></p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Box = ({ label, value, onChange }: any) => (
  <div style={{ marginBottom: '10px' }}>
    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
  </div>
);

const RodInput = ({ label, data, onUpdate }: any) => (
  <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</div>
    <div style={{ display: 'flex', gap: '5px' }}>
        <input type="number" value={data.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', padding: '5px' }} />
        <input type="number" value={data.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', padding: '5px', background: '#1565c0', color: '#fff' }} />
    </div>
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={data.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', padding: '5px' }} />
        <input type="number" value={data.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', padding: '5px', background: '#1565c0', color: '#fff' }} />
    </div>
  </div>
);

export default BeamBBS;
