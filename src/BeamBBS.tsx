import React, { useState, useMemo } from 'react';
import { Plus, Trash2, FileText, Calculator } from 'lucide-react';

/**
 * MASTER STANDARDS (From Image 50)
 * Site-specific bundle weights and rod counts per diameter.
 */
const STANDARDS = {
  8:  { rods: 10, bundleWeight: 47.40 },
  10: { rods: 7,  bundleWeight: 51.87 },
  12: { rods: 5,  bundleWeight: 53.35 },
  16: { rods: 3,  bundleWeight: 56.88 },
  20: { rods: 2,  bundleWeight: 59.26 },
  25: { rods: 1,  bundleWeight: 46.30 },
  BAR_LEN: 12.19 // Meters (40ft)
};

const DIAMETERS = [8, 10, 12, 16, 20, 25];

const UniqBeamBBS = () => {
  const [beams, setBeams] = useState([
    {
      id: Date.now(),
      name: 'B1',
      width: '230',
      depth: '380',
      mainL: '60',
      extraL: '30',
      spacing: '6',
      stirrupDia: 8,
      // Supporting two diameter entries per section for flexibility
      bottom: [{ dia: 16, nos: '2' }, { dia: 12, nos: '1' }],
      top:    [{ dia: 16, nos: '2' }, { dia: 12, nos: '1' }],
      extra:  [{ dia: 16, nos: '2' }, { dia: 12, nos: '1' }],
    }
  ]);

  // --- CALCULATION LOGIC ---
  const results = useMemo(() => {
    let projectGrandTotal = 0;
    const projectSummary: Record<number, number> = { 8:0, 10:0, 12:0, 16:0, 20:0, 25:0 };

    const calculatedBeams = beams.map(beam => {
      const beamMeters: Record<number, number> = { 8:0, 10:0, 12:0, 16:0, 20:0, 25:0 };
      
      const w = parseFloat(beam.width) || 0;
      const d = parseFloat(beam.depth) || 0;
      const mL = parseFloat(beam.mainL) || 0;
      const eL = parseFloat(beam.extraL) || 0;
      const s = parseFloat(beam.spacing) || 1;

      // 1. Bottom & Top Rods (3.281)
      [...beam.bottom, ...beam.top].forEach(rod => {
        const n = parseFloat(rod.nos) || 0;
        if (n > 0) beamMeters[rod.dia] += (mL * n) / 3.281;
      });

      // 2. Extra Rods (3.2811)
      beam.extra.forEach(rod => {
        const n = parseFloat(rod.nos) || 0;
        if (n > 0) beamMeters[rod.dia] += (eL * n) / 3.2811;
      });

      // 3. Stirrups (Precision Logic)
      const cutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const nStir = Math.ceil(mL / (s / 12)) + 1;
      beamMeters[beam.stirrupDia] += (nStir * cutFt) / 3.281;

      // 4. Convert to KG using Site Standards
      let beamTotalKg = 0;
      const beamKgBreakdown: Record<number, number> = {};

      Object.entries(beamMeters).forEach(([diaStr, meters]) => {
        const dia = parseInt(diaStr);
        const std = STANDARDS[dia as keyof typeof STANDARDS];
        if (meters > 0 && std) {
          const kg = (meters / (STANDARDS.BAR_LEN * std.rods)) * std.bundleWeight;
          beamKgBreakdown[dia] = kg;
          beamTotalKg += kg;
          projectSummary[dia] += kg;
        }
      });

      projectGrandTotal += beamTotalKg;
      return { ...beam, beamTotalKg, beamKgBreakdown };
    });

    return { calculatedBeams, projectSummary, projectGrandTotal };
  }, [beams]);

  // --- ACTIONS ---
  const addBeam = () => {
    const newBeam = { ...beams[0], id: Date.now(), name: `B${beams.length + 1}` };
    setBeams([...beams, newBeam]);
  };

  const updateRod = (beamId, section, index, field, value) => {
    setBeams(beams.map(b => {
      if (b.id === beamId) {
        const newSection = [...b[section]];
        newSection[index][field] = value;
        return { ...b, [section]: newSection };
      }
      return b;
    }));
  };

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', paddingBottom: '40px', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0277bd', color: 'white', padding: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>UNIQ DESIGNS</h1>
        <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>Universal Structural Automation</p>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '15px' }}>
        {results.calculatedBeams.map((beam, bIdx) => (
          <div key={beam.id} style={{ backgroundColor: 'white', borderRadius: '15px', marginBottom: '25px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            {/* Beam Title Bar */}
            <div style={{ backgroundColor: '#01579b', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>BEAM: {beam.name}</span>
              <button onClick={() => setBeams(beams.filter(b => b.id !== beam.id))} style={{ background: '#f44336', border: 'none', color: 'white', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>

            {/* Input Form */}
            <div style={{ padding: '20px' }}>
              {/* Dimensions */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <InputGroup label="WIDTH(MM)" value={beam.width} onChange={v => setBeams(beams.map(b => b.id === beam.id ? {...b, width: v} : b))} />
                <InputGroup label="DEPTH(MM)" value={beam.depth} onChange={v => setBeams(beams.map(b => b.id === beam.id ? {...b, depth: v} : b))} />
                <InputGroup label="MAIN(FT)" value={beam.mainL} onChange={v => setBeams(beams.map(b => b.id === beam.id ? {...b, mainL: v} : b))} />
              </div>

              {/* Rebar Sections */}
              <RebarSection label="BOTTOM REBAR" color="#e3f2fd" data={beam.bottom} onUpdate={(idx, f, v) => updateRod(beam.id, 'bottom', idx, f, v)} />
              <RebarSection label="TOP REBAR" color="#fff9c4" data={beam.top} onUpdate={(idx, f, v) => updateRod(beam.id, 'top', idx, f, v)} />
              <RebarSection label="EXTRA RODS" color="#e8f5e9" data={beam.extra} onUpdate={(idx, f, v) => updateRod(beam.id, 'extra', idx, f, v)} />

              {/* Bottom Row */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <InputGroup label="EX LEN (FT)" value={beam.extraL} onChange={v => setBeams(beams.map(b => b.id === beam.id ? {...b, extraL: v} : b))} />
                <InputGroup label="SPACING (IN)" value={beam.spacing} onChange={v => setBeams(beams.map(b => b.id === beam.id ? {...b, spacing: v} : b))} />
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>STIRRUP Ø</label>
                  <select value={beam.stirrupDia} onChange={e => setBeams(beams.map(b => b.id === beam.id ? {...b, stirrupDia: parseInt(e.target.value)} : b))} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}>
                    {DIAMETERS.map(d => <option key={d} value={d}>{d}mm</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Beam Total KG Footer */}
            <div style={{ backgroundColor: '#0288d1', color: 'white', padding: '15px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
              BEAM TOTAL: {beam.beamTotalKg.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* Action Buttons */}
        <button onClick={addBeam} style={{ width: '100%', backgroundColor: '#0277bd', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', marginBottom: '15px' }}>
          <Plus size={20} /> ADD ANOTHER BEAM
        </button>

        {/* Project Summary Card */}
        <div style={{ backgroundColor: '#01579b', borderRadius: '15px', padding: '20px', color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>PROJECT TOTALS (KG)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
            {DIAMETERS.map(d => (
              <div key={d} style={{ opacity: results.projectSummary[d] > 0 ? 1 : 0.4 }}>
                <div style={{ fontSize: '12px' }}>{d}mm</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{results.projectSummary[d].toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid white', textAlign: 'center' }}>
            <div style={{ fontSize: '14px' }}>GRAND TOTAL WEIGHT</div>
            <div style={{ fontSize: '28px', fontWeight: '900' }}>{results.projectGrandTotal.toFixed(2)} KG</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// UI SUB-COMPONENTS
const InputGroup = ({ label, value, onChange }) => (
  <div style={{ flex: 1 }}>
    <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
  </div>
);

const RebarSection = ({ label, color, data, onUpdate }) => (
  <div style={{ backgroundColor: color, padding: '10px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '8px' }}>{label}</span>
    <div style={{ display: 'flex', gap: '10px' }}>
      {data.map((rod, idx) => (
        <div key={idx} style={{ flex: 1, display: 'flex', gap: '5px' }}>
          <select value={rod.dia} onChange={e => onUpdate(idx, 'dia', parseInt(e.target.value))} style={{ flex: 1.5, padding: '5px', borderRadius: '4px', border: '1px solid #bbb' }}>
            {DIAMETERS.map(d => <option key={d} value={d}>{d}ø</option>)}
          </select>
          <input type="number" value={rod.nos} onChange={e => onUpdate(idx, 'nos', e.target.value)} placeholder="Nos" style={{ flex: 1, padding: '5px', border: '1px solid #bbb', borderRadius: '4px', textAlign: 'center' }} />
        </div>
      ))}
    </div>
  </div>
);

export default UniqBeamBBS;
