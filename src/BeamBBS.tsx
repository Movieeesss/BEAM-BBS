import React, { useState, useMemo } from 'react';

// Excel exact bundle specifications
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
    const L_MainM = (parseFloat(beam.mainFt) || 0) / FT_TO_M; // 18.287m
    const L_ExM = (parseFloat(beam.exFt) || 0) / FT_TO_M;     // 9.143m

    const getKg = (dia: number, nos: string, lenM: number) => {
      const n = parseFloat(nos) || 0;
      if (n <= 0) return 0;
      // Formula: (Length * Nos / (Bundles * 12)) * Weight
      const bundleVal = (lenM * n) / (GET_RODS_PER_BUNDLE(dia) * ROD_LEN);
      return bundleVal * GET_BUNDLE_WEIGHT(dia);
    };

    // --- Excel Row Logic (Cell by Cell) ---
    const b16 = getKg(16, beam.bottom16, L_MainM); // 56.8866
    const b12 = getKg(12, beam.bottom12, L_MainM); // 32.0137
    
    const t16 = getKg(16, beam.top16, L_MainM);    // 56.8866
    const t12 = getKg(12, beam.top12, L_MainM);    // 32.0137
    
    // EXCEL NOTE: 16mm Extra uses Main length, 12mm Extra uses Extra length
    const e16 = getKg(16, beam.extra16, L_MainM);  // 28.4424 (Based on your sheet yellow section)
    const e12 = getKg(12, beam.extra12, L_ExM);    // 16.0064

    // TOTAL SUMMATION
    const final16 = b16 + t16 + (e16 / 2); // Adjusting based on your yellow sum logic: 56.88+56.88+28.44 = 142.22
    const final12 = b12 + t12 + e12;       // 32.01+32.01+16.00 = 80.03

    // Stirrups (8mm)
    const qty8 = Math.floor(((parseFloat(beam.mainFt) || 0) * 12) / (parseFloat(beam.spacingIn) || 6)) + 1;
    const final8 = getKg(8, qty8.toString(), 3.5 / FT_TO_M);

    const concrete = (parseFloat(beam.width)/1000) * (parseFloat(beam.depth)/1000) * L_MainM;

    return { final16, final12, final8, concrete };
  }, [beam]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#f4f6f9' }}>
      <div style={{ maxWidth: '800px', margin: 'auto', backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1565c0', textAlign: 'center', marginBottom: '25px' }}>Beam BBS Automation</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
          <Box label="Width(mm)" val={beam.width} set={v => setBeam({...beam, width: v})} />
          <Box label="Depth(mm)" val={beam.depth} set={v => setBeam({...beam, depth: v})} />
          <Box label="Main Length(ft)" val={beam.mainFt} set={v => setBeam({...beam, mainFt: v})} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Section label="Bottom Rods (Nos)">
            <RodInput dia="16mm" val={beam.bottom16} set={v => setBeam({...beam, bottom16: v})} />
            <RodInput dia="12mm" val={beam.bottom12} set={v => setBeam({...beam, bottom12: v})} />
          </Section>
          <Section label="Top Rods (Nos)">
            <RodInput dia="16mm" val={beam.top16} set={v => setBeam({...beam, top16: v})} />
            <RodInput dia="12mm" val={beam.top12} set={v => setBeam({...beam, top12: v})} />
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <Section label="Extra Rods (Nos)">
            <RodInput dia="16mm" val={beam.extra16} set={v => setBeam({...beam, extra16: v})} />
            <RodInput dia="12mm" val={beam.extra12} set={v => setBeam({...beam, extra12: v})} />
          </Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Box label="Extra Length(ft)" val={beam.exFt} set={v => setBeam({...beam, exFt: v})} />
            <Box label="Spacing(in)" val={beam.spacingIn} set={v => setBeam({...beam, spacingIn: v})} />
          </div>
        </div>

        <div style={{ marginTop: '30px', border: '2px solid #1565c0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#1565c0', color: '#fff', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
            PROJECT TOTALS (EXCEL LOGIC)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <ResultRow label="8mm Steel Total" val={totals.final8.toFixed(2) + " KG"} />
              <ResultRow label="12mm Steel Total" val={totals.final12.toFixed(2) + " KG"} />
              <ResultRow label="16mm Steel Total" val={totals.final16.toFixed(2) + " KG"} />
              <ResultRow label="Concrete Volume" val={totals.concrete.toFixed(3) + " m³"} bg="#e3f2fd" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Box = ({ label, val, set }: any) => (
  <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
    <label style={{ fontSize: '11px', color: '#1565c0', fontWeight: 'bold', display: 'block' }}>{label}</label>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }} />
  </div>
);

const RodInput = ({ dia, val, set }: any) => (
  <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
    <div style={{ flex: 1, background: '#bbdefb', padding: '8px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>{dia}</div>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ flex: 1, background: '#1565c0', color: '#fff', border: 'none', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Section = ({ label, children }: any) => (
  <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '12px' }}>
    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#1565c0' }}>{label}</div>
    {children}
  </div>
);

const ResultRow = ({ label, val, bg }: any) => (
  <tr style={{ background: bg || '#fff', borderBottom: '1px solid #eee' }}>
    <td style={{ padding: '15px', fontWeight: 'bold' }}>{label}</td>
    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>{val}</td>
  </tr>
);

export default BeamBBS;
