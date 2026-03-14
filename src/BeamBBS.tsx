import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// MASTER REFERENCE DATA (From Image 50)
const STEEL_REF: Record<number, { rodsPerBundle: number; bundleWeightKg: number; unitWeight: number }> = {
  8:  { rodsPerBundle: 10, bundleWeightKg: 47.40, unitWeight: 0.400 },
  10: { rodsPerBundle: 7,  bundleWeightKg: 51.87, unitWeight: 0.618 },
  12: { rodsPerBundle: 5,  bundleWeightKg: 53.35, unitWeight: 0.890 },
  16: { rodsPerBundle: 3,  bundleWeightKg: 56.88, unitWeight: 1.590 },
  20: { rodsPerBundle: 2,  bundleWeightKg: 59.26, unitWeight: 2.470 },
  25: { rodsPerBundle: 1,  bundleWeightKg: 46.30, unitWeight: 3.860 },
};

const ROD_LENGTH_M = 12.19; // 40 Feet standard

interface BeamData {
  id: string;
  name: string;
  width: string;
  depth: string;
  mainLengthFt: string;
  extraLengthFt: string;
  // Rebar Dia
  diaBottom: number;
  diaTop: number;
  diaExtra: number;
  diaStirrups: number;
  // Rod Counts
  numBottom: string;
  numTop: string;
  numExtra: string;
  spacingIn: string;
}

const BeamBBS: React.FC = () => {
  const [beams, setBeams] = useState<BeamData[]>([
    {
      id: '1', name: 'B1', width: '230', depth: '380', mainLengthFt: '60', extraLengthFt: '30',
      diaBottom: 16, diaTop: 16, diaExtra: 16, diaStirrups: 8,
      numBottom: '2', numTop: '2', numExtra: '2', spacingIn: '6'
    }
  ]);

  const updateBeam = (id: string, field: keyof BeamData, val: any) => {
    setBeams(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const calculateWeight = (dia: number, totalMeters: number) => {
    const ref = STEEL_REF[dia];
    if (!ref) return 0;
    const requiredBundles = totalMeters / (ROD_LENGTH_M * ref.rodsPerBundle);
    return requiredBundles * ref.bundleWeightKg;
  };

  const results = useMemo(() => {
    const diaSummary: Record<number, number> = {};
    let grandTotal = 0;

    const detailed = beams.map(beam => {
      const L = parseFloat(beam.mainLengthFt) || 0;
      const Le = parseFloat(beam.extraLengthFt) || 0;
      const S = parseFloat(beam.spacingIn) || 1;
      const W = parseFloat(beam.width) || 0;
      const D = parseFloat(beam.depth) || 0;

      // 1. MAIN RODS (Bottom & Top)
      const bottomM = (L * (parseFloat(beam.numBottom) || 0)) / 3.281;
      const topM = (L * (parseFloat(beam.numTop) || 0)) / 3.281;
      const extraM = (Le * (parseFloat(beam.numExtra) || 0)) / 3.2811;

      // 2. STIRRUPS (Image 40 Formula)
      const cuttingLengthFt = (2 * ((W / 25.4) + (D / 25.4)) - 6) / 12;
      const numStirrups = Math.ceil(L / (S / 12)) + 1;
      const stirrupM = (numStirrups * cuttingLengthFt) / 3.281;

      // Weights
      const wBottom = calculateWeight(beam.diaBottom, bottomM);
      const wTop = calculateWeight(beam.diaTop, topM);
      const wExtra = calculateWeight(beam.diaExtra, extraM);
      const wStirrup = calculateWeight(beam.diaStirrups, stirrupM);

      const subTotal = wBottom + wTop + wExtra + wStirrup;
      grandTotal += subTotal;

      // Summary Aggregation
      [[beam.diaBottom, wBottom], [beam.diaTop, wTop], [beam.diaExtra, wExtra], [beam.diaStirrups, wStirrup]]
        .forEach(([d, kg]) => { diaSummary[d] = (diaSummary[d] || 0) + kg; });

      return { ...beam, subTotal };
    });

    return { detailed, diaSummary, grandTotal };
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1e88e5', color: '#fff', padding: '20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>UNIQ DESIGNS</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>Structural Steel Automation - Beam BBS</p>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        {results.detailed.map(beam => (
          <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
             <div style={{ padding: '15px', borderBottom: '2px solid #1e88e5', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#1e88e5' }}>BEAM: {beam.name}</strong>
                <button onClick={() => setBeams(beams.filter(b => b.id !== beam.id))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>REMOVE</button>
             </div>
             
             <div style={{ padding: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <InputBox label="WIDTH(MM)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
                  <InputBox label="DEPTH(MM)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
                  <InputBox label="MAIN(FT)" value={beam.mainLengthFt} onChange={v => updateBeam(beam.id, 'mainLengthFt', v)} />
                </div>

                <Section label="BOTTOM REBAR" dia={beam.diaBottom} num={beam.numBottom} 
                         onDiaChange={v => updateBeam(beam.id, 'diaBottom', v)} onNumChange={v => updateBeam(beam.id, 'numBottom', v)} color="#e3f2fd" />
                
                <Section label="TOP REBAR" dia={beam.diaTop} num={beam.numTop} 
                         onDiaChange={v => updateBeam(beam.id, 'diaTop', v)} onNumChange={v => updateBeam(beam.id, 'numTop', v)} color="#fff9c4" />
                
                <Section label="EXTRA RODS" dia={beam.diaExtra} num={beam.numExtra} 
                         onDiaChange={v => updateBeam(beam.id, 'diaExtra', v)} onNumChange={v => updateBeam(beam.id, 'numExtra', v)} color="#e8f5e9" />

                <div style={{ display: 'flex', gap: '10px' }}>
                   <InputBox label="EX LEN (FT)" value={beam.extraLengthFt} onChange={v => updateBeam(beam.id, 'extraLengthFt', v)} />
                   <InputBox label="SPACING (IN)" value={beam.spacingIn} onChange={v => updateBeam(beam.id, 'spacingIn', v)} />
                </div>
             </div>

             <div style={{ backgroundColor: '#1e88e5', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
               BEAM TOTAL: {beam.subTotal.toFixed(2)} KG
             </div>
          </div>
        ))}

        <div style={{ backgroundColor: '#1e88e5', borderRadius: '15px', color: '#fff', padding: '20px', marginTop: '20px' }}>
           <h3 style={{ textAlign: 'center', marginTop: 0 }}>PROJECT TOTALS (KG)</h3>
           <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '15px' }}>
              {Object.entries(results.diaSummary).map(([dia, kg]) => (
                <div key={dia} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px' }}>{dia}mm</div>
                  <div style={{ fontWeight: 'bold' }}>{Number(kg).toFixed(2)}</div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// UI COMPONENTS
const InputBox = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: '10px', color: '#666', display: 'block' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }} />
  </div>
);

const Section = ({ label, dia, num, onDiaChange, onNumChange, color }: any) => (
  <div style={{ backgroundColor: color, padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>{label}</label>
    <div style={{ display: 'flex', gap: '10px' }}>
      <select value={dia} onChange={e => onDiaChange(Number(e.target.value))} style={{ flex: 1, padding: '5px' }}>
        {[8, 10, 12, 16, 20, 25].map(d => <option key={d} value={d}>{d}ø</option>)}
      </select>
      <input type="number" value={num} onChange={e => onNumChange(e.target.value)} style={{ flex: 1, padding: '5px' }} placeholder="Nos" />
    </div>
  </div>
);

export default BeamBBS;
