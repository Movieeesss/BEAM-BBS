import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// MASTER REFERENCE DATA (From Image 50)
const BUNDLE_DATA: Record<number, { rods: number; weight: number }> = {
  8:  { rods: 10, weight: 47.40 },
  10: { rods: 7,  weight: 51.87 },
  12: { rods: 5,  weight: 53.35 },
  16: { rods: 3,  weight: 56.88 },
  20: { rods: 2,  weight: 59.26 },
  25: { rods: 1,  weight: 46.30 },
};

const ROD_LEN_M = 12.19; // 40ft per bar

interface RebarGroup {
  d1: number; n1: string;
  d2: number; n2: string;
}

interface Beam {
  id: string; name: string;
  width: string; depth: string;
  mainLenFt: string; extraLenFt: string;
  bottom: RebarGroup; top: RebarGroup; extra: RebarGroup;
  stirrupDia: number; spacingIn: string;
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<Beam[]>([
    {
      id: '1', name: 'B1', width: '230', depth: '380', mainLenFt: '60', extraLenFt: '30',
      bottom: { d1: 16, n1: '1', d2: 12, n2: '1' },
      top:    { d1: 16, n1: '1', d2: 12, n2: '1' },
      extra:  { d1: 16, n1: '1', d2: 12, n2: '1' },
      stirrupDia: 8, spacingIn: '6'
    }
  ]);

  const updateNested = (id: string, group: 'bottom' | 'top' | 'extra', field: string, val: any) => {
    setBeams(prev => prev.map(b => b.id === id ? { ...b, [group]: { ...b[group], [field]: val } } : b));
  };

  const calcKg = (dia: number, meters: number) => {
    const ref = BUNDLE_DATA[dia];
    if (!ref || meters <= 0) return 0;
    // EXACT EXCEL LOGIC: Total Meters / (12.19 * Rods per Bundle) * Bundle Weight
    return (meters / (ROD_LEN_M * ref.rods)) * ref.weight;
  };

  const results = useMemo(() => {
    const diaSum: Record<number, number> = {};
    let grandTotal = 0;

    const detailed = beams.map(b => {
      const L = parseFloat(b.mainLenFt) || 0;
      const Le = parseFloat(b.extraLenFt) || 0;
      const W = parseFloat(b.width) || 0;
      const D = parseFloat(b.depth) || 0;
      const S = parseFloat(b.spacingIn) || 1;

      // Calculate Total Meters for each rod type
      const mBot1 = (L * (parseFloat(b.bottom.n1) || 0)) / 3.281;
      const mBot2 = (L * (parseFloat(b.bottom.n2) || 0)) / 3.281;
      const mTop1 = (L * (parseFloat(b.top.n1) || 0)) / 3.281;
      const mTop2 = (L * (parseFloat(b.top.n2) || 0)) / 3.281;
      const mExt1 = (Le * (parseFloat(b.extra.n1) || 0)) / 3.2811;
      const mExt2 = (Le * (parseFloat(b.extra.n2) || 0)) / 3.2811;

      // Stirrup Logic (Precision Formula from Image 40)
      const cutFt = (2 * ((W / 25.4) + (D / 25.4)) - 6) / 12;
      const nStirrup = Math.ceil(L / (S / 12)) + 1;
      const mStirrup = (nStirrup * cutFt) / 3.281;

      // Convert Meters to KG using Bundle weights
      const kgs = [
        { d: b.bottom.d1, kg: calcKg(b.bottom.d1, mBot1) },
        { d: b.bottom.d2, kg: calcKg(b.bottom.d2, mBot2) },
        { d: b.top.d1, kg: calcKg(b.top.d1, mTop1) },
        { d: b.top.d2, kg: calcKg(b.top.d2, mTop2) },
        { d: b.extra.d1, kg: calcKg(b.extra.d1, mExt1) },
        { d: b.extra.d2, kg: calcKg(b.extra.d2, mExt2) },
        { d: b.stirrupDia, kg: calcKg(b.stirrupDia, mStirrup) }
      ];

      const beamTotal = kgs.reduce((acc, curr) => acc + curr.kg, 0);
      grandTotal += beamTotal;
      kgs.forEach(item => { if(item.kg > 0) diaSum[item.d] = (diaSum[item.d] || 0) + item.kg; });

      return { ...b, beamTotal };
    });

    return { detailed, diaSum, grandTotal };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', paddingBottom: '30px' }}>
      <div style={{ backgroundColor: '#0277bd', color: '#fff', padding: '15px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>UNIQ DESIGNS</h2>
        <span style={{ fontSize: '12px' }}>Structural Steel Automation</span>
      </div>

      <div style={{ padding: '10px', maxWidth: '500px', margin: '0 auto' }}>
        {results.detailed.map(beam => (
          <div key={beam.id} style={{ background: '#fff', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ background: '#01579b', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between' }}>
              <span>BEAM: {beam.name}</span>
              <button onClick={() => setBeams(beams.filter(x => x.id !== beam.id))} style={{ background: 'red', color: '#fff', border: 'none', borderRadius: '4px' }}>REMOVE</button>
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <UIInput label="WIDTH(MM)" value={beam.width} onChange={v => setBeams(beams.map(x => x.id === beam.id ? {...x, width: v}:x))} />
                <UIInput label="DEPTH(MM)" value={beam.depth} onChange={v => setBeams(beams.map(x => x.id === beam.id ? {...x, depth: v}:x))} />
                <UIInput label="MAIN(FT)" value={beam.mainLenFt} onChange={v => setBeams(beams.map(x => x.id === beam.id ? {...x, mainLenFt: v}:x))} />
              </div>

              <DualRow label="BOTTOM REBAR" data={beam.bottom} group="bottom" id={beam.id} update={updateNested} color="#e3f2fd" />
              <DualRow label="TOP REBAR" data={beam.top} group="top" id={beam.id} update={updateNested} color="#fff9c4" />
              <DualRow label="EXTRA RODS" data={beam.extra} group="extra" id={beam.id} update={updateNested} color="#e8f5e9" />

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <UIInput label="EX LEN(FT)" value={beam.extraLenFt} onChange={v => setBeams(beams.map(x => x.id === beam.id ? {...x, extraLenFt: v}:x))} />
                <UIInput label="SPACING(IN)" value={beam.spacingIn} onChange={v => setBeams(beams.map(x => x.id === beam.id ? {...x, spacingIn: v}:x))} />
              </div>
            </div>

            <div style={{ background: '#0288d1', color: '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
              TOTAL: {beam.beamTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        <div style={{ background: '#01579b', color: '#fff', padding: '15px', borderRadius: '12px' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>PROJECT SUMMARY</h4>
          {Object.entries(results.diaSum).map(([d, kg]) => (
            <div key={d} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '5px 0' }}>
              <span>{d}mm Steel:</span><span>{Number(kg).toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '18px', fontWeight: 'bold' }}>GRAND TOTAL: {results.grandTotal.toFixed(2)} KG</div>
        </div>
      </div>
    </div>
  );
};

// UI HELPER COMPONENTS
const UIInput = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#555' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
  </div>
);

const DualRow = ({ label, data, group, id, update, color }: any) => (
  <div style={{ background: color, padding: '8px', borderRadius: '8px', marginBottom: '8px' }}>
    <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{label}</span>
    <div style={{ display: 'flex', gap: '5px' }}>
      <select value={data.d1} onChange={e => update(id, group, 'd1', Number(e.target.value))} style={{ flex: 1 }}>
        {[8, 10, 12, 16, 20, 25].map(d => <option key={d} value={d}>{d}ø</option>)}
      </select>
      <input type="number" placeholder="Nos" value={data.n1} onChange={e => update(id, group, 'n1', e.target.value)} style={{ flex: 1, width: '40px' }} />
      <div style={{ borderLeft: '1px solid #999', margin: '0 5px' }}></div>
      <select value={data.d2} onChange={e => update(id, group, 'd2', Number(e.target.value))} style={{ flex: 1 }}>
        {[8, 10, 12, 16, 20, 25].map(d => <option key={d} value={d}>{d}ø</option>)}
      </select>
      <input type="number" placeholder="Nos" value={data.n2} onChange={e => update(id, group, 'n2', e.target.value)} style={{ flex: 1, width: '40px' }} />
    </div>
  </div>
);

export default BeamBBS;
