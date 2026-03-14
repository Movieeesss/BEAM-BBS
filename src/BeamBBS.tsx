import React, { useState, useMemo } from 'react';

// --- DATA FROM YOUR REFERENCE SHEET (IMAGE 39) ---
// These values are the foundation of your entire Excel logic
const REFERENCE_DATA = {
  8:  { unitWeight: 0.400, bundleWeight: 47.4,  rodsInBundle: 10 },
  10: { unitWeight: 0.618, bundleWeight: 51.87, rodsInBundle: 7 },
  12: { unitWeight: 0.890, bundleWeight: 53.35, rodsInBundle: 5 },
  16: { unitWeight: 1.590, bundleWeight: 56.88, rodsInBundle: 3 },
  20: { unitWeight: 2.470, bundleWeight: 59.26, rodsInBundle: 2 },
  25: { unitWeight: 3.860, bundleWeight: 46.3,  rodsInBundle: 1 }
};

const FEET_TO_METER = 3.281; 
const ROD_LENGTH_METER = 12.19; // From Cell I3 (Crucial for error-free sum)

const BeamBBSFinal = () => {
  const [beams, setBeams] = useState([
    {
      id: Date.now(), grid: 'B1', w: '230', d: '380', mainFt: '60', exFt: '30', spacing: '6',
      bottom1: { dia: 16, nos: '1' }, bottom2: { dia: 12, nos: '1' },
      top1: { dia: 16, nos: '1' }, top2: { dia: 12, nos: '1' },
      ex1: { dia: 16, nos: '1' }, ex2: { dia: 12, nos: '1' }
    }
  ]);

  const updateField = (id, path, val) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b };
      if (path.includes('.')) {
        const [sec, f] = path.split('.');
        newB[sec] = { ...newB[sec], [f]: val };
      } else {
        newB[path] = val;
      }
      return newB;
    }));
  };

  // --- ERROR-FREE CALCULATION ENGINE ---
  const totals = useMemo(() => {
    const summary = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / FEET_TO_METER;
      const L_Ex = (parseFloat(b.exFt) || 0) / FEET_TO_METER;

      // Excel Logic: (Length * Nos / RodLength / RodsInBundle) * BundleWeight
      const getKg = (dia, nos, lenM) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !REFERENCE_DATA[dia]) return 0;
        const ref = REFERENCE_DATA[dia];
        
        // This formula replicates your Excel Required Bundles -> Converting Bundles to Kgs
        const requiredBundles = (lenM * n) / (ROD_LENGTH_METER * ref.rodsInBundle);
        return requiredBundles * ref.bundleWeight;
      };

      summary[b.bottom1.dia] += getKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += getKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia]    += getKg(b.top1.dia,    b.top1.nos,    L_Main);
      summary[b.top2.dia]    += getKg(b.top2.dia,    b.top2.nos,    L_Main);
      summary[b.ex1.dia]     += getKg(b.ex1.dia,     b.ex1.nos,     L_Main);
      summary[b.ex2.dia]     += getKg(b.ex2.dia,     b.ex2.nos,     L_Ex);

      // Stirrup Logic: 8mm Steel
      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += getKg(8, stirrupQty, 3.5 / FEET_TO_METER);
    });
    return summary;
  }, [beams]);

  return (
    <div style={{ maxWidth: '100%', padding: '10px', background: '#f4f7fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1976d2', color: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>UNIQ DESIGNS</h2>
        <span style={{ fontSize: '12px' }}>Structural Steel BBS Automation</span>
      </div>

      {beams.map(b => (
        <div key={b.id} style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <input value={b.grid} onChange={e => updateField(b.id, 'grid', e.target.value)} style={{ border: 'none', borderBottom: '2px solid #1976d2', fontWeight: 'bold', width: '60px' }} />
            <button onClick={() => setBeams(beams.filter(x => x.id !== b.id))} style={{ color: 'red', border: 'none', background: 'none', fontSize: '12px' }}>REMOVE</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <BoxInput label="W(mm)" val={b.w} set={v => updateField(b.id, 'w', v)} />
            <BoxInput label="D(mm)" val={b.d} set={v => updateField(b.id, 'd', v)} />
            <BoxInput label="Main(ft)" val={b.mainFt} set={v => updateField(b.id, 'mainFt', v)} />
          </div>

          <RowSection title="BOTTOM" d1={b.bottom1} d2={b.bottom2} update1={(f,v)=>updateField(b.id,`bottom1.${f}`,v)} update2={(f,v)=>updateField(b.id,`bottom2.${f}`,v)} bg="#e3f2fd" />
          <RowSection title="TOP" d1={b.top1} d2={b.top2} update1={(f,v)=>updateField(b.id,`top1.${f}`,v)} update2={(f,v)=>updateField(b.id,`top2.${f}`,v)} bg="#fff9c4" />
          <RowSection title="EXTRA" d1={b.ex1} d2={b.ex2} update1={(f,v)=>updateField(b.id,`ex1.${f}`,v)} update2={(f,v)=>updateField(b.id,`ex2.${f}`,v)} bg="#e8f5e9" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
            <BoxInput label="Ex Len(ft)" val={b.exFt} set={v => updateField(b.id, 'exFt', v)} />
            <BoxInput label="Spacing(in)" val={b.spacing} set={v => updateField(b.id, 'spacing', v)} />
          </div>
        </div>
      ))}

      <button onClick={() => setBeams([...beams, {...beams[0], id: Date.now()}])} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#fff', border: '1px dashed #1976d2', color: '#1976d2', fontWeight: 'bold' }}>+ ADD BEAM</button>

      {/* FIXED FOOTER TOTALS */}
      <div style={{ position: 'sticky', bottom: 0, background: '#1976d2', color: '#fff', padding: '15px', borderRadius: '15px 15px 0 0', marginTop: '20px', display: 'flex', justifyContent: 'space-around' }}>
        <Stat dia="8mm" val={totals[8]} />
        <Stat dia="12mm" val={totals[12]} />
        <Stat dia="16mm" val={totals[16]} />
      </div>
    </div>
  );
};

const BoxInput = ({ label, val, set }) => (
  <div style={{ background: '#f1f3f4', padding: '5px', borderRadius: '5px' }}>
    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{label}</div>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'none', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RowSection = ({ title, d1, d2, update1, update2, bg }) => (
  <div style={{ background: bg, padding: '8px', borderRadius: '8px', marginBottom: '8px' }}>
    <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>{title}</div>
    <div style={{ display: 'flex', gap: '5px' }}>
      <InputPair d={d1} up={update1} />
      <InputPair d={d2} up={update2} />
    </div>
  </div>
);

const InputPair = ({ d, up }) => (
  <div style={{ display: 'flex', background: '#fff', borderRadius: '4px', border: '1px solid #ccc', overflow: 'hidden', flex: 1 }}>
    <select value={d.dia} onChange={e => up('dia', parseInt(e.target.value))} style={{ border: 'none', background: '#eee', fontSize: '11px' }}>
      {[8, 10, 12, 16, 20, 25].map(x => <option key={x} value={x}>{x}ø</option>)}
    </select>
    <input type="number" value={d.nos} onChange={e => up('nos', e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Stat = ({ dia, val }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '10px' }}>{dia}</div>
    <div style={{ fontWeight: 'bold' }}>{val.toFixed(2)}</div>
  </div>
);

export default BeamBBSFinal;
