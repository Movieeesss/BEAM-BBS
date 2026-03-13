import React, { useState, useMemo } from 'react';

// Excel-la irukara mathiri Bundle details
const GET_RODS_PER_BUNDLE = (dia: number) => {
  const map: Record<number, number> = { 8: 10, 10: 7, 12: 5, 16: 3, 20: 2, 25: 1 };
  return map[dia] || 0;
};

const GET_BUNDLE_WEIGHT = (dia: number) => {
  const map: Record<number, number> = { 8: 47.4, 10: 51.87, 12: 53.35, 16: 56.88, 20: 59.26, 25: 46.3 };
  return map[dia] || 0;
};

const FT_TO_M = 3.281;
const ROD_LEN = 12;

const BeamBBS = () => {
  const [beam, setBeam] = useState({
    width: '230', depth: '380', mainFt: '60', exFt: '30', spacingIn: '6',
    bottom16: '1', bottom12: '1',
    top16: '1', top12: '1',
    extra16: '1', extra12: '1'
  });

  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    
    const L_MainM = (parseFloat(beam.mainFt) || 0) / FT_TO_M;
    const L_ExM = (parseFloat(beam.exFt) || 0) / FT_TO_M;

    // Excel Formula: (Length * Nos / (RodsPerBundle * 12)) * BundleWeight
    const getKg = (dia: number, nosStr: string, lenM: number) => {
      const nos = parseFloat(nosStr) || 0;
      if (nos <= 0 || dia <= 0) return 0;
      const bundles = (lenM * nos) / (GET_RODS_PER_BUNDLE(dia) * ROD_LEN);
      return bundles * GET_BUNDLE_WEIGHT(dia);
    };

    // 16mm Summation (Excel mathiri 3 edathulaiyum add panrom)
    summary[16] += getKg(16, beam.bottom16, L_MainM); 
    summary[16] += getKg(16, beam.top16, L_MainM);    
    summary[16] += getKg(16, beam.extra16, L_ExM);   

    // 12mm Summation
    summary[12] += getKg(12, beam.bottom12, L_MainM); 
    summary[12] += getKg(12, beam.top12, L_MainM);    
    summary[12] += getKg(12, beam.extra12, L_ExM);   

    // 8mm (Stirrups)
    const stirrupQty = Math.floor(((parseFloat(beam.mainFt) || 0) * 12) / (parseFloat(beam.spacingIn) || 6)) + 1;
    summary[8] += getKg(8, stirrupQty.toString(), 3.5 / FT_TO_M);

    const concrete = (parseFloat(beam.width)/1000) * (parseFloat(beam.depth)/1000) * L_MainM;

    return { summary, concrete };
  }, [beam]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
      <div style={{ maxWidth: '800px', margin: 'auto', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1565c0', textAlign: 'center' }}>Beam BBS Calculation</h2>
        
        {/* Dimensions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <Box label="Width(mm)" val={beam.width} onChange={v => setBeam({...beam, width: v})} />
          <Box label="Depth(mm)" val={beam.depth} onChange={v => setBeam({...beam, depth: v})} />
          <Box label="Main Length(ft)" val={beam.mainFt} onChange={v => setBeam({...beam, mainFt: v})} />
        </div>

        {/* Rod Nos Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
          <Section label="Bottom Rods (Nos)">
            <Row dia="16mm" val={beam.bottom16} set={v => setBeam({...beam, bottom16: v})} />
            <Row dia="12mm" val={beam.bottom12} set={v => setBeam({...beam, bottom12: v})} />
          </Section>
          <Section label="Top Rods (Nos)">
            <Row dia="16mm" val={beam.top16} set={v => setBeam({...beam, top16: v})} />
            <Row dia="12mm" val={beam.top12} set={v => setBeam({...beam, top12: v})} />
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
          <Section label="Extra Rods (Nos)">
            <Row dia="16mm" val={beam.extra16} set={v => setBeam({...beam, extra16: v})} />
            <Row dia="12mm" val={beam.extra12} set={v => setBeam({...beam, extra12: v})} />
          </Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Box label="Extra Length(ft)" val={beam.exFt} onChange={v => setBeam({...beam, exFt: v})} />
            <Box label="Spacing(in)" val={beam.spacingIn} onChange={v => setBeam({...beam, spacingIn: v})} />
          </div>
        </div>

        {/* Total Results */}
        <div style={{ marginTop: '30px' }}>
          <div style={{ background: '#1565c0', color: '#fff', padding: '12px', borderRadius: '8px 8px 0 0', fontWeight: 'bold', textAlign: 'center' }}>
            PROJECT TOTALS
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #1565c0' }}>
            <tbody>
              {Object.entries(totals.summary).map(([dia, kg]) => kg > 0 && (
                <tr key={dia} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{dia}mm Steel Weight</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>{kg.toFixed(2)} KG</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#e3f2fd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>Concrete Volume</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{totals.concrete.toFixed(3)} m³</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// UI Components
const Box = ({ label, val, onChange }: any) => (
  <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
    <label style={{ fontSize: '11px', color: '#1565c0', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={val} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }} />
  </div>
);

const Row = ({ dia, val, set }: any) => (
  <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
    <div style={{ flex: 1, background: '#bbdefb', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>{dia}</div>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ flex: 1, background: '#1565c0', color: '#fff', border: 'none', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Section = ({ label, children }: any) => (
  <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '10px' }}>
    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#1565c0' }}>{label}</div>
    {children}
  </div>
);

export default BeamBBS;
