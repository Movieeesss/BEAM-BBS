import React, { useState, useMemo } from 'react';

const BUNDLE_DATA: Record<number, { rods: number; weight: number }> = {
  8:  { rods: 10, weight: 47.40 },
  10: { rods: 7,  weight: 51.87 },
  12: { rods: 5,  weight: 53.35 },
  16: { rods: 3,  weight: 56.88 },
  20: { rods: 2,  weight: 59.26 },
  25: { rods: 1,  weight: 46.30 },
};

const BeamBBS: React.FC = () => {
  const [beam, setBeam] = useState({
    width: '230', depth: '380', mainL: '60', extraL: '30', spacing: '6',
    bot16: '2', bot12: '1', top16: '2', top12: '1', ext16: '2', ext12: '1'
  });

  const finalTotals = useMemo(() => {
    const calc = (dia: number, m: number) => {
      const ref = BUNDLE_DATA[dia];
      return (m / (12.19 * ref.rods)) * ref.weight;
    };

    // Meters
    const m16 = ((parseFloat(beam.mainL)*parseFloat(beam.bot16))/3.281) + 
                ((parseFloat(beam.mainL)*parseFloat(beam.top16))/3.281) + 
                ((parseFloat(beam.extraL)*parseFloat(beam.ext16))/3.2811);

    const m12 = ((parseFloat(beam.mainL)*parseFloat(beam.bot12))/3.281) + 
                ((parseFloat(beam.mainL)*parseFloat(beam.top12))/3.281) + 
                ((parseFloat(beam.extraL)*parseFloat(beam.ext12))/3.2811);

    // Stirrups (8mm)
    const cutFt = (2 * ((parseFloat(beam.width)/25.4) + (parseFloat(beam.depth)/25.4)) - 6) / 12;
    const nStir = Math.ceil(parseFloat(beam.mainL) / (parseFloat(beam.spacing)/12)) + 1;
    const m8 = (nStir * cutFt) / 3.281;

    const kg16 = calc(16, m16);
    const kg12 = calc(12, m12);
    const kg8 = calc(8, m8);

    return { kg16, kg12, kg8, total: kg16 + kg12 + kg8 };
  }, [beam]);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#2196f3', color: '#fff', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>UNIQ DESIGNS</h1>
        <p style={{ margin: 0 }}>Beam Structural Automation</p>
      </header>

      <div style={{ padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <Field label="WIDTH(MM)" val={beam.width} onChange={v => setBeam({...beam, width: v})} />
            <Field label="DEPTH(MM)" val={beam.depth} onChange={v => setBeam({...beam, depth: v})} />
            <Field label="MAIN(FT)" val={beam.mainL} onChange={v => setBeam({...beam, mainL: v})} />
          </div>

          <RebarGroup label="BOTTOM REBAR (16ø / 12ø)" 
            v1={beam.bot16} onChange1={v => setBeam({...beam, bot16: v})}
            v2={beam.bot12} onChange2={v => setBeam({...beam, bot12: v})} color="#e3f2fd" />

          <RebarGroup label="TOP REBAR (16ø / 12ø)" 
            v1={beam.top16} onChange1={v => setBeam({...beam, top16: v})}
            v2={beam.top12} onChange2={v => setBeam({...beam, top12: v})} color="#fff9c4" />

          <RebarGroup label="EXTRA RODS (16ø / 12ø)" 
            v1={beam.ext16} onChange1={v => setBeam({...beam, ext16: v})}
            v2={beam.ext12} onChange2={v => setBeam({...beam, ext12: v})} color="#e8f5e9" />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <Field label="EX LEN (FT)" val={beam.extraL} onChange={v => setBeam({...beam, extraL: v})} />
            <Field label="SPACING (IN)" val={beam.spacing} onChange={v => setBeam({...beam, spacing: v})} />
          </div>

          <div style={{ background: '#2196f3', color: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', marginTop: '20px', fontWeight: 'bold' }}>
            BEAM TOTAL: {finalTotals.total.toFixed(2)} KG
          </div>
        </div>

        <div style={{ background: '#1976d2', color: '#fff', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
          <h3 style={{ textAlign: 'center', marginTop: 0 }}>PROJECT TOTALS (KG)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
            <div><small>8mm</small><br/>{finalTotals.kg8.toFixed(2)}</div>
            <div><small>12mm</small><br/>{finalTotals.kg12.toFixed(2)}</div>
            <div><small>16mm</small><br/>{finalTotals.kg16.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, val, onChange }: any) => (
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>{label}</label>
    <input type="number" value={val} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
  </div>
);

const RebarGroup = ({ label, v1, onChange1, v2, onChange2, color }: any) => (
  <div style={{ background: color, padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{label}</label>
    <div style={{ display: 'flex', gap: '10px' }}>
      <input type="number" value={v1} onChange={e => onChange1(e.target.value)} style={{ flex: 1, padding: '8px' }} placeholder="16mm Nos" />
      <input type="number" value={v2} onChange={e => onChange2(e.target.value)} style={{ flex: 1, padding: '8px' }} placeholder="12mm Nos" />
    </div>
  </div>
);

export default BeamBBS;
