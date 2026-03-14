import React, { useState, useMemo } from 'react';

// --- DATA FROM YOUR REFERENCE SHEET (EXCEL MATCH) ---
const REFERENCE_DATA = {
  8:  { unitWeight: 0.400, bundleWeight: 47.4,  rodsInBundle: 10 },
  10: { unitWeight: 0.618, bundleWeight: 51.87, rodsInBundle: 7 },
  12: { unitWeight: 0.890, bundleWeight: 53.35, rodsInBundle: 5 },
  16: { unitWeight: 1.590, bundleWeight: 56.88, rodsInBundle: 3 },
  20: { unitWeight: 2.470, bundleWeight: 59.26, rodsInBundle: 2 },
  25: { unitWeight: 3.860, bundleWeight: 46.3,  rodsInBundle: 1 }
};

const FEET_TO_METER = 3.281; 
const ROD_LENGTH_METER = 12.19; // Exact 40ft match from Image 39

const UniqDesignsBBS = () => {
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

  // --- ENGINE: REPLICATING EXCEL SUMMATION EXACTLY ---
  const totals = useMemo(() => {
    const summary = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / FEET_TO_METER;
      const L_Ex = (parseFloat(b.exFt) || 0) / FEET_TO_METER;

      const getKg = (dia, nos, lenM) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !REFERENCE_DATA[dia]) return 0;
        const ref = REFERENCE_DATA[dia];
        // The core Excel logic for Required Bundles -> KGs
        const reqBundles = (lenM * n) / (ROD_LENGTH_METER * ref.rodsInBundle);
        return reqBundles * ref.bundleWeight;
      };

      summary[b.bottom1.dia] += getKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += getKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia]    += getKg(b.top1.dia,    b.top1.nos,    L_Main);
      summary[b.top2.dia]    += getKg(b.top2.dia,    b.top2.nos,    L_Main);
      summary[b.ex1.dia]     += getKg(b.ex1.dia,     b.ex1.nos,     L_Main);
      summary[b.ex2.dia]     += getKg(b.ex2.dia,     b.ex2.nos,     L_Ex);

      // 8mm Stirrups Calculation (Matches Image 33 Logic)
      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += getKg(8, stirrupQty, 3.5 / FEET_TO_METER);
    });
    return summary;
  }, [beams]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh', padding: '10px' }}>
      <header style={{ background: '#0d6efd', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>UNIQ DESIGNS</h1>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Structural Steel BBS Automation</p>
      </header>

      {beams.map(b => (
        <div key={b.id} style={{ background: '#fff', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <input value={b.grid} onChange={e => updateField(b.id, 'grid', e.target.value)} style={{ border: 'none', borderBottom: '2px solid #0d6efd', fontSize: '18px', fontWeight: 'bold', width: '80px', color: '#0d6efd' }} />
            <button onClick={() => setBeams(beams.filter(x => x.id !== b.id))} style={{ border: 'none', background: 'none', color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>REMOVE</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <Field label="W(mm)" val={b.w} set={v => updateField(b.id, 'w', v)} />
            <Field label="D(mm)" val={b.d} set={v => updateField(b.id, 'd', v)} />
            <Field label="MAIN(FT)" val={b.mainFt} set={v => updateField(b.id, 'mainFt', v)} />
          </div>

          <Row title="BOTTOM REBAR" d1={b.bottom1} d2={b.bottom2} update1={(f,v)=>updateField(b.id,`bottom1.${f}`,v)} update2={(f,v)=>updateField(b.id,`bottom2.${f}`,v)} color="#e7f1ff" />
          <Row title="TOP REBAR" d1={b.top1} d2={b.top2} update1={(f,v)=>updateField(b.id,`top1.${f}`,v)} update2={(f,v)=>updateField(b.id,`top2.${f}`,v)} color="#fff3cd" />
          <Row title="EXTRA RODS" d1={b.ex1} d2={b.ex2} update1={(f,v)=>updateField(b.id,`ex1.${f}`,v)} update2={(f,v)=>updateField(b.id,`ex2.${f}`,v)} color="#d1e7dd" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <Field label="EX LEN(FT)" val={b.exFt} set={v => updateField(b.id, 'exFt', v)} />
            <Field label="SPACING(IN)" val={b.spacing} set={v => updateField(b.id, 'spacing', v)} />
          </div>
        </div>
      ))}

      <button onClick={() => setBeams([...beams, {...beams[0], id: Date.now()}])} style={{ width: '100%', padding: '15px', borderRadius: '10px', background: 'white', border: '2px dashed #0d6efd', color: '#0d6efd', fontWeight: 'bold', marginBottom: '100px' }}>+ ADD ANOTHER BEAM</button>

      {/* FIXED FOOTER TOTALS - MOBILE READY */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0d6efd', color: 'white', padding: '15px', borderRadius: '20px 20px 0 0', boxShadow: '0 -5px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <Stat dia="8mm" val={totals[8]} />
        <Stat dia="12mm" val={totals[12]} />
        <Stat dia="16mm" val={totals[16]} />
      </footer>
    </div>
  );
};

const Field = ({ label, val, set }) => (
  <div style={{ background: '#f1f3f5', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#495057' }}>{label}</label>
    <input type="number" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '16px', outline: 'none' }} />
  </div>
);

const Row = ({ title, d1, d2, update1, update2, color }) => (
  <div style={{ background: color, padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
    <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <Rebar dia={d1.dia} nos={d1.nos} setDia={v=>update1('dia',v)} setNos={v=>update1('nos',v)} />
      <Rebar dia={d2.dia} nos={d2.nos} setDia={v=>update2('dia',v)} setNos={v=>update2('nos',v)} />
    </div>
  </div>
);

const Rebar = ({ dia, nos, setDia, setNos }) => (
  <div style={{ display: 'flex', flex: 1, background: 'white', borderRadius: '6px', border: '1px solid #ced4da', overflow: 'hidden' }}>
    <select value={dia} onChange={e=>setDia(parseInt(e.target.value))} style={{ border: 'none', padding: '5px', background: '#e9ecef', fontSize: '14px' }}>
      {[8,10,12,16,20,25].map(x => <option key={x} value={x}>{x}ø</option>)}
    </select>
    <input type="number" value={nos} onChange={e=>setNos(e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }} />
  </div>
);

const Stat = ({ dia, val }) => (
  <div>
    <div style={{ fontSize: '11px', opacity: 0.8 }}>{dia}</div>
    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{val.toFixed(2)}</div>
  </div>
);

export default UniqDesignsBBS;
