import React, { useState, useMemo, useCallback } from 'react';

// --- DATA FROM YOUR EXCEL (Images 21-30) ---
const BUNDLE_CONFIG = {
  8:  { weight: 47.4,  rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.3,  rods: 1 }
};

const FEET_TO_METER = 3.281; // Image 12
const STD_ROD_LEN = 12;      // Standard Rod Length

const BeamBBSMobile = () => {
  const [beams, setBeams] = useState([
    {
      id: Date.now(),
      grid: 'B1',
      w: '230',
      d: '380',
      mainFt: '60',
      exFt: '30',
      spacing: '6',
      bottom1: { dia: 16, nos: '1' },
      bottom2: { dia: 12, nos: '1' },
      top1: { dia: 16, nos: '1' },
      top2: { dia: 12, nos: '1' },
      ex1: { dia: 16, nos: '1' },
      ex2: { dia: 12, nos: '1' },
    }
  ]);

  const updateField = (id, path, value) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b };
      if (path.includes('.')) {
        const [section, field] = path.split('.');
        newB[section] = { ...newB[section], [field]: value };
      } else {
        newB[path] = value;
      }
      return newB;
    }));
  };

  const addBeam = () => {
    setBeams([...beams, { ...beams[0], id: Date.now(), grid: `B${beams.length + 1}` }]);
  };

  // --- ENGINE: EXACT EXCEL MATCH ---
  const totals = useMemo(() => {
    const summary = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    
    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / FEET_TO_METER;
      const L_Ex = (parseFloat(b.exFt) || 0) / FEET_TO_METER;

      const calc = (dia, nos, len) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !BUNDLE_CONFIG[dia]) return 0;
        const config = BUNDLE_CONFIG[dia];
        // Total Meters * (BundleWeight / Total Meters in one bundle)
        return (len * n) * (config.weight / (config.rods * STD_ROD_LEN));
      };

      summary[b.bottom1.dia] += calc(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += calc(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia] += calc(b.top1.dia, b.top1.nos, L_Main);
      summary[b.top2.dia] += calc(b.top2.dia, b.top2.nos, L_Main);
      summary[b.ex1.dia] += calc(b.ex1.dia, b.ex1.nos, L_Main);
      summary[b.ex2.dia] += calc(b.ex2.dia, b.ex2.nos, L_Ex);

      // Stirrups (Images 33-38)
      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += calc(8, stirrupQty, 3.5 / FEET_TO_METER);
    });
    return summary;
  }, [beams]);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', background: '#f0f2f5', minHeight: '100vh', padding: '10px', paddingBottom: '120px' }}>
      <div style={{ textAlign: 'center', background: '#1a73e8', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>UNIQ DESIGNS</h2>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Structural Steel Automation</p>
      </div>

      {beams.map((b) => (
        <div key={b.id} style={{ background: 'white', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <input 
              value={b.grid} 
              onChange={(e) => updateField(b.id, 'grid', e.target.value)}
              style={{ fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderBottom: '2px solid #1a73e8', width: '80px', color: '#1a73e8' }}
            />
            <button onClick={() => setBeams(beams.filter(x => x.id !== b.id))} style={{ color: '#d93025', border: 'none', background: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}>REMOVE</button>
          </div>

          {/* Dimensions Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <MobileInput label="Width(mm)" value={b.w} onChange={(v) => updateField(b.id, 'w', v)} />
            <MobileInput label="Depth(mm)" value={b.d} onChange={(v) => updateField(b.id, 'd', v)} />
            <MobileInput label="Main(ft)" value={b.mainFt} onChange={(v) => updateField(b.id, 'mainFt', v)} />
          </div>

          <MobileSection title="BOTTOM REBAR" data1={b.bottom1} data2={b.bottom2} onUpdate1={(f, v) => updateField(b.id, `bottom1.${f}`, v)} onUpdate2={(f, v) => updateField(b.id, `bottom2.${f}`, v)} color="#e8f0fe" />
          <MobileSection title="TOP REBAR" data1={b.top1} data2={b.top2} onUpdate1={(f, v) => updateField(b.id, `top1.${f}`, v)} onUpdate2={(f, v) => updateField(b.id, `top2.${f}`, v)} color="#fef7e0" />
          <MobileSection title="EXTRA RODS" data1={b.ex1} data2={b.ex2} onUpdate1={(f, v) => updateField(b.id, `ex1.${f}`, v)} onUpdate2={(f, v) => updateField(b.id, `ex2.${f}`, v)} color="#e6fffa" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <MobileInput label="Ex Len (ft)" value={b.exFt} onChange={(v) => updateField(b.id, 'exFt', v)} />
            <MobileInput label="Spacing (in)" value={b.spacing} onChange={(v) => updateField(b.id, 'spacing', v)} />
          </div>
        </div>
      ))}

      <button onClick={addBeam} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '2px dashed #1a73e8', color: '#1a73e8', fontWeight: 'bold', background: 'white' }}>+ ADD ANOTHER BEAM</button>

      {/* Floating Mobile Summary */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a73e8', color: 'white', padding: '15px', borderRadius: '20px 20px 0 0', boxShadow: '0 -4px 15px rgba(0,0,0,0.2)' }}>
        <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '0.9rem' }}>PROJECT TOTALS (KG)</h4>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '5px' }}>
          {Object.entries(totals).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ textAlign: 'center', minWidth: '70px', borderRight: '1px solid rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '0.7rem' }}>{dia}mm</div>
              <div style={{ fontWeight: 'bold' }}>{kg.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-Components
const MobileInput = ({ label, value, onChange }) => (
  <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
    <div style={{ fontSize: '0.65rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</div>
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const MobileSection = ({ title, data1, data2, onUpdate1, onUpdate2, color }) => (
  <div style={{ background: color, padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', color: '#3c4043' }}>{title}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <RebarRow dia={data1.dia} nos={data1.nos} setDia={(v) => onUpdate1('dia', v)} setNos={(v) => onUpdate1('nos', v)} />
      <RebarRow dia={data2.dia} nos={data2.nos} setDia={(v) => onUpdate2('dia', v)} setNos={(v) => onUpdate2('nos', v)} />
    </div>
  </div>
);

const RebarRow = ({ dia, nos, setDia, setNos }) => (
  <div style={{ display: 'flex', background: 'white', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
    <select value={dia} onChange={(e) => setDia(parseInt(e.target.value))} style={{ border: 'none', fontSize: '0.8rem', padding: '5px', background: '#f1f3f4', width: '55px' }}>
      {[8, 10, 12, 16, 20, 25].map(d => <option key={d} value={d}>{d}ø</option>)}
    </select>
    <input type="number" value={nos} onChange={(e) => setNos(e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }} placeholder="Nos" />
  </div>
);

export default BeamBBSMobile;
