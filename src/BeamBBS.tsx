import React, { useState, useMemo, useCallback } from 'react';

// Standard conversion factors
const FT_TO_M = 0.3048;
const IN_TO_MM = 25.4;

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
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let grandConcrete = 0;

    beams.forEach(beam => {
      const lMainM = (parseFloat(beam.lenMain) || 0) * FT_TO_M;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * FT_TO_M;
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;

      // 1. Concrete Calculation (L * W * D)
      const vol = wM * dM * lMainM;
      grandConcrete += vol;

      // 2. Steel Calculation Function (D^2 / 162 * Total Length)
      const calcWeight = (dia: number, nosStr: string, lengthM: number) => {
        const nos = parseFloat(nosStr) || 0;
        if (nos === 0 || dia === 0) return 0;
        return (Math.pow(dia, 2) / 162) * (nos * lengthM);
      };

      // Calculate all reinforcement parts
      const parts = [
        { dia: beam.bottom.dia1, kg: calcWeight(beam.bottom.dia1, beam.bottom.num1, lMainM) },
        { dia: beam.bottom.dia2, kg: calcWeight(beam.bottom.dia2, beam.bottom.num2, lMainM) },
        { dia: beam.top.dia1, kg: calcWeight(beam.top.dia1, beam.top.num1, lMainM) },
        { dia: beam.top.dia2, kg: calcWeight(beam.top.dia2, beam.top.num2, lMainM) },
        { dia: beam.extra.dia1, kg: calcWeight(beam.extra.dia1, beam.extra.num1, lExtraM) },
        { dia: beam.extra.dia2, kg: calcWeight(beam.extra.dia2, beam.extra.num2, lExtraM) }
      ];

      parts.forEach(p => { if (p.dia in summary) summary[p.dia] += p.kg; });

      // 3. Stirrups Calculation
      // Spacing is in inches, converted to meters for quantity calculation
      const spacingM = (parseFloat(beam.spacing) * IN_TO_MM) / 1000;
      const stirrupQty = Math.floor(lMainM / spacingM) + 1;
      
      // Stirrup Cut Length (2 * (W-ClearCover) + 2 * (D-ClearCover) + Hooks)
      // Assuming 40mm clear cover and 100mm total for hooks
      const cutLenM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 100) / 1000;
      const stirrupWeight = (Math.pow(beam.diaStirrups, 2) / 162) * (stirrupQty * cutLenM);
      
      summary[beam.diaStirrups] += stirrupWeight;
    });

    return { summary, grandConcrete };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS</h2>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <span style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '20px' }}>{beam.grid}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <Box label="Width(mm)" value={beam.width} onChange={(v: string) => updateBeam(beam.id, 'width', v)} />
            <Box label="Depth(mm)" value={beam.depth} onChange={(v: string) => updateBeam(beam.id, 'depth', v)} />
            <Box label="Main(ft)" value={beam.lenMain} onChange={(v: string) => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Row label="Bottom" rod={beam.bottom} onUpdate={(f: string, v: string) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <Row label="Top" rod={beam.top} onUpdate={(f: string, v: string) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <Row label="Extra" rod={beam.extra} onUpdate={(f: string, v: string) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Box label="Ex Len(ft)" value={beam.lenExtra} onChange={(v: string) => updateBeam(beam.id, 'lenExtra', v)} />
              <Box label="Spacing(in)" value={beam.spacing} onChange={(v: string) => updateBeam(beam.id, 'spacing', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h3>
        <p style={{ display: 'flex', justifyContent: 'space-between' }}>Concrete: <strong>{results.grandConcrete.toFixed(3)} m³</strong></p>
        <hr />
        {Object.entries(results.summary).map(([dia, kg]) => (parseFloat(kg.toString()) > 0) && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
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

const Row = ({ label, rod, onUpdate }: any) => {
  const act = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #eee', padding: '8px', borderRadius: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: act(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: act(rod.num1) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num1) ? '#fff' : '#000' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: act(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: act(rod.num2) ? '#64b5f6' : '#eee', border: 'none', borderRadius: '4px', textAlign: 'center', color: act(rod.num2) ? '#fff' : '#000' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
