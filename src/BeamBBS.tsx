import React, { useState, useMemo } from 'react';

// --- DATA FROM YOUR EXCEL SHEET ---
const GET_RODS_PER_BUNDLE = (dia: number) => {
  const map: Record<number, number> = { 8: 10, 10: 7, 12: 5, 16: 3, 20: 2, 25: 1 };
  return map[dia] || 0;
};

const GET_BUNDLE_WEIGHT = (dia: number) => {
  const map: Record<number, number> = { 8: 47.4, 10: 51.87, 12: 53.35, 16: 56.88, 20: 59.26, 25: 46.3 };
  return map[dia] || 0;
};

const FT_TO_M_DIVIDER = 3.281;
const ROD_UNIT_LEN = 12;

const BeamBBS = () => {
  const [beam, setBeam] = useState({
    width: '230', depth: '380', mainFt: '60', exFt: '30', spacingIn: '6',
    bottom1: { d: 16, n: '1' }, bottom2: { d: 12, n: '1' },
    top1: { d: 16, n: '1' }, top2: { d: 12, n: '1' },
    extra1: { d: 16, n: '1' }, extra2: { d: 12, n: '1' }
  });

  const totals = useMemo(() => {
    const summary: Record<number, { bundles: number; kg: number }> = {
      8: { bundles: 0, kg: 0 },
      10: { bundles: 0, kg: 0 },
      12: { bundles: 0, kg: 0 },
      16: { bundles: 0, kg: 0 },
      20: { bundles: 0, kg: 0 },
      25: { bundles: 0, kg: 0 }
    };
    
    const L_MainM = (parseFloat(beam.mainFt) || 0) / FT_TO_M_DIVIDER;
    const L_ExtraM = (parseFloat(beam.exFt) || 0) / FT_TO_M_DIVIDER;

    /**
     * YOUR EXACT EXCEL FORMULA:
     * Step 1: Bundles = (Length * Nos) / (RodsPerBundle * 12)
     * Step 2: Total KG = Bundles * BundleWeight
     */
    const addLine = (dia: number, nosStr: string, lengthM: number) => {
      const nos = parseFloat(nosStr) || 0;
      if (nos <= 0 || dia <= 0) return;
      
      const rodsInBundle = GET_RODS_PER_BUNDLE(dia);
      const bundleWeight = GET_BUNDLE_WEIGHT(dia);
      
      const reqBundles = (lengthM * nos) / (rodsInBundle * ROD_UNIT_LEN);
      const lineKg = reqBundles * bundleWeight;

      summary[dia].bundles += reqBundles;
      summary[dia].kg += lineKg;
    };

    // Calculate all 6 rows from your UI
    addLine(beam.bottom1.d, beam.bottom1.n, L_MainM);
    addLine(beam.bottom2.d, beam.bottom2.n, L_MainM);
    addLine(beam.top1.d, beam.top1.n, L_MainM);
    addLine(beam.top2.d, beam.top2.n, L_MainM);
    addLine(beam.extra1.d, beam.extra1.n, L_MainM); // Row 5
    addLine(beam.extra2.d, beam.extra2.n, L_ExtraM); // Row 6 (Extra length)

    // Stirrups (8mm)
    const stirrupQty = Math.floor(((parseFloat(beam.mainFt) || 0) * 12) / (parseFloat(beam.spacingIn) || 6)) + 1;
    addLine(8, stirrupQty.toString(), 3.5 / FT_TO_M_DIVIDER);

    const concrete = (parseFloat(beam.width)/1000) * (parseFloat(beam.depth)/1000) * L_MainM;

    return { summary, concrete };
  }, [beam]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f7fa', fontFamily: 'Arial' }}>
      <div style={{ maxWidth: '850px', margin: 'auto', backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1565c0', textAlign: 'center', marginBottom: '25px' }}>Beam BBS Automation</h2>
        
        {/* Dimensions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
          <Box label="Width(mm)" val={beam.width} onChange={v => setBeam({...beam, width: v})} />
          <Box label="Depth(mm)" val={beam.depth} onChange={v => setBeam({...beam, depth: v})} />
          <Box label="Main Length(ft)" val={beam.mainFt} onChange={v => setBeam({...beam, mainFt: v})} />
        </div>

        {/* Rod Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <RodEntry label="Bottom Rods" d1={beam.bottom1} d2={beam.bottom2} on1={v => setBeam({...beam, bottom1: {...beam.bottom1, n: v}})} on2={v => setBeam({...beam, bottom2: {...beam.bottom2, n: v}})} />
          <RodEntry label="Top Rods" d1={beam.top1} d2={beam.top2} on1={v => setBeam({...beam, top1: {...beam.top1, n: v}})} on2={v => setBeam({...beam, top2: {...beam.top2, n: v}})} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <RodEntry label="Extra Rods" d1={beam.extra1} d2={beam.extra2} on1={v => setBeam({...beam, extra1: {...beam.extra1, n: v}})} on2={v => setBeam({...beam, extra2: {...beam.extra2, n: v}})} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Box label="Extra Length(ft)" val={beam.exFt} onChange={v => setBeam({...beam, exFt: v})} />
            <Box label="Spacing(in)" val={beam.spacingIn} onChange={v => setBeam({...beam, spacingIn: v})} />
          </div>
        </div>

        {/* Project Totals Table */}
        <div style={{ marginTop: '40px', border: '2px solid #1565c0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: '#1565c0', color: '#fff', padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>PROJECT TOTALS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Diameter</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Required Bundles</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Total Weight (KG)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals.summary).map(([dia, data]) => data.kg > 0 && (
                <tr key={dia}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{dia}mm</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{data.bundles.toFixed(5)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{data.kg.toFixed(2)} KG</td>
                </tr>
              ))}
              <tr style={{ background: '#e3f2fd' }}>
                <td colSpan={2} style={{ padding: '12px', fontWeight: 'bold' }}>Concrete Volume</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{totals.concrete.toFixed(3)} m³</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Box = ({ label, val, onChange }: any) => (
  <div style={{ background: '#f1f4f9', padding: '10px', borderRadius: '8px' }}>
    <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold', display: 'block' }}>{label}</label>
    <input type="number" value={val} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '16px', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RodEntry = ({ label, d1, d2, on1, on2 }: any) => (
  <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '12px' }}>
    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#1565c0' }}>{label}</div>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
      <div style={{ flex: 1, background: '#e3f2fd', textAlign: 'center', padding: '8px', borderRadius: '6px' }}>{d1.d}mm</div>
      <input type="number" value={d1.n} onChange={e => on1(e.target.value)} style={{ flex: 1, background: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', textAlign: 'center' }} />
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={{ flex: 1, background: '#e3f2fd', textAlign: 'center', padding: '8px', borderRadius: '6px' }}>{d2.d}mm</div>
      <input type="number" value={d2.n} onChange={e => on2(e.target.value)} style={{ flex: 1, background: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', textAlign: 'center' }} />
    </div>
  </div>
);

export default BeamBBS;
