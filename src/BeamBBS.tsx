import React, { useState, useMemo } from 'react';

// Bundle weights and rods per bundle (Excel Data)
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
    const L_MainM = (parseFloat(beam.mainFt) || 0) / FT_TO_M; 
    const L_ExM = (parseFloat(beam.exFt) || 0) / FT_TO_M;

    const getKg = (dia: number, nosStr: string, lenM: number) => {
      const n = parseFloat(nosStr) || 0;
      if (n <= 0) return 0;
      // Formula: (Length * Nos / (BundleRods * 12)) * BundleWeight
      return (lenM * n / (GET_RODS_PER_BUNDLE(dia) * ROD_LEN)) * GET_BUNDLE_WEIGHT(dia);
    };

    // --- 16mm Summation (Bottom + Top + Extra) ---
    // 56.8866 + 56.8866 + 28.4424 = 142.22 KG
    const final16 = getKg(16, beam.bottom16, L_MainM) + 
                    getKg(16, beam.top16, L_MainM) + 
                    getKg(16, beam.extra16, L_ExM);

    // --- 12mm Summation (Bottom + Top + Extra) ---
    // 32.0137 + 32.0137 + 16.0064 = 80.03 KG
    const final12 = getKg(12, beam.bottom12, L_MainM) + 
                    getKg(12, beam.top12, L_MainM) + 
                    getKg(12, beam.extra12, L_ExM);

    // Stirrups (8mm)
    const qty8 = Math.floor(((parseFloat(beam.mainFt) || 0) * 12) / (parseFloat(beam.spacingIn) || 6)) + 1;
    const final8 = getKg(8, qty8.toString(), 3.5 / FT_TO_M);

    const concrete = (parseFloat(beam.width)/1000) * (parseFloat(beam.depth)/1000) * L_MainM;

    return { final16, final12, final8, concrete };
  }, [beam]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f8fa', minHeight: '100vh', fontFamily: 'Arial' }}>
      <div style={{ maxWidth: '850px', margin: 'auto', backgroundColor: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1a73e8', textAlign: 'center', marginBottom: '30px', fontWeight: 'bold' }}>Beam BBS Automation</h2>
        
        {/* Dimensions Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <InputBox label="Width(mm)" val={beam.width} set={v => setBeam({...beam, width: v})} />
          <InputBox label="Depth(mm)" val={beam.depth} set={v => setBeam({...beam, depth: v})} />
          <InputBox label="Main Length(ft)" val={beam.mainFt} set={v => setBeam({...beam, mainFt: v})} />
        </div>

        {/* Rod Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '25px' }}>
          <Section label="Bottom Rods (Nos)">
            <RodRow dia="16mm" val={beam.bottom16} set={v => setBeam({...beam, bottom16: v})} />
            <RodRow dia="12mm" val={beam.bottom12} set={v => setBeam({...beam, bottom12: v})} />
          </Section>
          <Section label="Top Rods (Nos)">
            <RodRow dia="16mm" val={beam.top16} set={v => setBeam({...beam, top16: v})} />
            <RodRow dia="12mm" val={beam.top12} set={v => setBeam({...beam, top12: v})} />
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <Section label="Extra Rods (Nos)">
            <RodRow dia="16mm" val={beam.extra16} set={v => setBeam({...beam, extra16: v})} />
            <RodRow dia="12mm" val={beam.extra12} set={v => setBeam({...beam, extra12: v})} />
          </Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <InputBox label="Extra Length(ft)" val={beam.exFt} set={v => setBeam({...beam, exFt: v})} />
            <InputBox label="Spacing(in)" val={beam.spacingIn} set={v => setBeam({...beam, spacingIn: v})} />
          </div>
        </div>

        {/* Result Summary Table */}
        <div style={{ marginTop: '40px', border: '2px solid #1a73e8', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: '#1a73e8', color: '#fff', padding: '15px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}>
            PROJECT TOTALS (EXCEL LOGIC)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18px' }}>
            <tbody>
              <TableRow label="8mm Steel Total" val={totals.final8.toFixed(2) + " KG"} />
              <TableRow label="12mm Steel Total" val={totals.final12.toFixed(2) + " KG"} />
              <TableRow label="16mm Steel Total" val={totals.final16.toFixed(2) + " KG"} />
              <TableRow label="Concrete Volume" val={totals.concrete.toFixed(3) + " m³"} highlight />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InputBox = ({ label, val, set }: any) => (
  <div style={{ background: '#f1f3f4', padding: '12px', borderRadius: '8px', border: '1px solid #dadce0' }}>
    <label style={{ fontSize: '12px', color: '#5f6368', fontWeight: 'bold', display: 'block' }}>{label}</label>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} />
  </div>
);

const RodRow = ({ dia, val, set }: any) => (
  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
    <div style={{ flex: 1, background: '#e8f0fe', padding: '10px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: '#1a73e8' }}>{dia}</div>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ flex: 1, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }} />
  </div>
);

const Section = ({ label, children }: any) => (
  <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '12px' }}>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a73e8', marginBottom: '15px' }}>{label}</div>
    {children}
  </div>
);

const TableRow = ({ label, val, highlight }: any) => (
  <tr style={{ borderBottom: '1px solid #eee', background: highlight ? '#f8f9fa' : '#fff' }}>
    <td style={{ padding: '20px', fontWeight: 'bold', color: '#3c4043' }}>{label}</td>
    <td style={{ padding: '20px', textAlign: 'right', fontWeight: 'bold', color: highlight ? '#1a73e8' : '#202124' }}>{val}</td>
  </tr>
);

export default BeamBBS;
