import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getWeightPerMeter = (dia: number) => (dia * dia) / 162;

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
  numBeams: string;
}

const BeamBBS: React.FC = () => {
  const [method, setMethod] = useState<'excel' | 'precision'>('excel');
  const [lapFactor, setLapFactor] = useState<number>(50);
  const SLAB_THICKNESS_MM = 125; // 5 inches

  const [beams, setBeams] = useState<BeamData[]>([
    { 
      id: '1', grid: 'B1', width: '230', depth: '380', 
      lenMain: '55.25', lenExtra: '26.7',
      bottom: { dia1: 16, num1: '3', dia2: 12, num2: '0' },
      top: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
      extra: { dia1: 16, num1: '1', dia2: 12, num2: '0' },
      diaStirrups: 8, spacing: '6', numBeams: '1' 
    }
  ]);

  const updateBeam = (id: string, field: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...b, [parent]: { ...(b as any)[parent], [child]: val } };
      }
      return { ...b, [field]: val };
    }));
  };

  const results = useMemo(() => {
    const diaSummary: Record<number, number> = {};
    let totalConcreteM3 = 0;

    const detailed = beams.map(beam => {
      const nBeams = parseFloat(beam.numBeams) || 1;
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const slabM = SLAB_THICKNESS_MM / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * 0.3048;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * 0.3048;
      const sIn = parseFloat(beam.spacing) || 1;

      // Logic: Concrete calculated on (Depth - Slab Thickness)
      const volM3 = wM * (dM - slabM) * lMainM * nBeams;
      totalConcreteM3 += Math.max(0, volM3);

      const lapM = (d: number) => method === 'precision' ? (lapFactor * d) / 1000 : 0;

      const calcKg = (rod: RodSet, len: number, hasLap: boolean) => {
        const kg1 = (len + (hasLap ? lapM(rod.dia1) : 0)) * (parseFloat(rod.num1) || 0) * getWeightPerMeter(rod.dia1);
        const kg2 = (len + (hasLap ? lapM(rod.dia2) : 0)) * (parseFloat(rod.num2) || 0) * getWeightPerMeter(rod.dia2);
        return { kg1, kg2 };
      };

      const bRes = calcKg(beam.bottom, lMainM, true);
      const tRes = calcKg(beam.top, lMainM, true);
      const eRes = calcKg(beam.extra, lExtraM, false);

      const stirrupLengthM = method === 'excel' ? 0.9144 : (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const totalTies = (Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / sIn) + 1) * nBeams;
      const stirrupsKg = stirrupLengthM * totalTies * getWeightPerMeter(beam.diaStirrups);

      // Update Summary
      [[beam.bottom.dia1, bRes.kg1], [beam.bottom.dia2, bRes.kg2], 
       [beam.top.dia1, tRes.kg1], [beam.top.dia2, tRes.kg2],
       [beam.extra.dia1, eRes.kg1], [beam.extra.dia2, eRes.kg2],
       [beam.diaStirrups, stirrupsKg]].forEach(([d, kg]) => {
        if (kg > 0) diaSummary[d as number] = (diaSummary[d as number] || 0) + (kg as number * nBeams);
      });

      return { ...beam, volM3, subTotal: (bRes.kg1 + bRes.kg2 + tRes.kg1 + tRes.kg2 + eRes.kg1 + eRes.kg2 + stirrupsKg) * nBeams };
    });

    return { detailed, diaSummary, totalConcreteM3 };
  }, [beams, method, lapFactor]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px' }}>
      <div style={{ backgroundColor: '#1565c0', padding: '15px', borderRadius: '12px', color: '#fff', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS CODING</h2>
        <small>Concrete: Width * (Depth - 125mm) * Length</small>
      </div>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', marginBottom: '20px', overflow: 'hidden', border: '1px solid #d1d9e0' }}>
          <div style={{ backgroundColor: '#1e88e5', padding: '10px', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
             <strong>{beam.grid}</strong>
             <span>Vol: {results.detailed.find(r => r.id === beam.id)?.volM3.toFixed(3)} m³</span>
          </div>

          <div style={{ padding: '15px' }}>
            {/* Dimensions */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              <DataBox label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
              <DataBox label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
              <DataBox label="Length(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
            </div>

            {/* Rebar - Dual Columns */}
            <h4 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>REINFORCEMENT (Dia | Nos)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <DualRow label="Bottom Rods" rod={beam.bottom} onUpdate={(f, v) => updateBeam(beam.id, `bottom.${f}`, v)} />
              <DualRow label="Top Rods" rod={beam.top} onUpdate={(f, v) => updateBeam(beam.id, `top.${f}`, v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DualRow label="Extra Rods" rod={beam.extra} onUpdate={(f, v) => updateBeam(beam.id, `extra.${f}`, v)} />
              <DataBox label="Stirrup Dia" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '2px solid #1565c0' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>PROJECT TOTALS</h3>
        <p>Total Concrete: <strong>{results.totalConcreteM3.toFixed(3)} m³</strong></p>
        {Object.entries(results.diaSummary).map(([d, kg]) => (
          <div key={d} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
            <span>{d}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const DataBox = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', display: 'block', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const DualRow = ({ label, rod, onUpdate }: { label: string, rod: RodSet, onUpdate: (f: string, v: any) => void }) => {
  const isActive = (n: string) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #e3f2fd', padding: '5px', borderRadius: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: isActive(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: isActive(rod.num1) ? '#90caf9' : '#eeeeee', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: isActive(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
        <input type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: isActive(rod.num2) ? '#90caf9' : '#eeeeee', border: 'none', borderRadius: '4px', textAlign: 'center' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
