import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getWeightPerMeter = (dia: number) => (dia * dia) / 162;

interface BeamData {
  id: string;
  grid: string;
  width: string;
  depth: string;
  lenMain: string;
  lenExtra: string;
  diaBottom: number;
  numBottom: string;
  diaTop: number;
  numTop: string;
  diaExtra: number;
  numExtra: string;
  diaSFR: number;
  numSFR: string;
  diaStirrups: number;
  spacing: string;
  numBeams: string;
}

const UniversalBeamBBS: React.FC = () => {
  const [method, setMethod] = useState<'excel' | 'precision'>('excel');
  const [lapFactor, setLapFactor] = useState<number>(50); // Feature 5: Global Lap Toggle
  const [beams, setBeams] = useState<BeamData[]>([
    { 
      id: '1', grid: 'B1', width: '230', depth: '380', 
      lenMain: '55.25', lenExtra: '26.7',
      diaBottom: 16, numBottom: '3', 
      diaTop: 16, numTop: '2', 
      diaExtra: 16, numExtra: '1', 
      diaSFR: 12, numSFR: '0',
      diaStirrups: 8, spacing: '6', numBeams: '1' 
    }
  ]);

  const updateBeam = (id: string, field: keyof BeamData, val: any) => {
    setBeams(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  // Feature 1: Duplicate/Copy Feature
  const duplicateBeam = (beam: BeamData) => {
    const nextId = Date.now().toString();
    setBeams([...beams, { ...beam, id: nextId, grid: beam.grid + ' (Copy)' }]);
  };

  const addNewBeam = () => {
    const nextId = Date.now().toString();
    setBeams([...beams, { ...beams[0], id: nextId, grid: `New Grid` }]);
  };

  const results = useMemo(() => {
    const diaSummary: Record<number, number> = {};
    let grandTotalKg = 0;
    let totalConcreteM3 = 0;

    const detailed = beams.map(beam => {
      const nBeams = parseFloat(beam.numBeams) || 0;
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * 0.3048;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * 0.3048;
      const sIn = parseFloat(beam.spacing) || 1;

      // Feature 2: Concrete Volume Integration
      const volM3 = wM * dM * lMainM * nBeams;
      totalConcreteM3 += volM3;

      let bKg, tKg, eKg, sfrKg, stirrupsKg;
      
      // Precision adds Lap Length (e.g. 50d)
      const lapM = method === 'precision' ? (lapFactor * beam.diaBottom) / 1000 : 0;

      bKg = (lMainM + lapM) * (parseFloat(beam.numBottom) || 0) * getWeightPerMeter(beam.diaBottom) * nBeams;
      tKg = (lMainM + lapM) * (parseFloat(beam.numTop) || 0) * getWeightPerMeter(beam.diaTop) * nBeams;
      eKg = lExtraM * (parseFloat(beam.numExtra) || 0) * getWeightPerMeter(beam.diaExtra) * nBeams;
      sfrKg = lMainM * (parseFloat(beam.numSFR) || 0) * getWeightPerMeter(beam.diaSFR) * nBeams;
        
      const stirrupLengthM = method === 'excel' ? 0.9144 : (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const totalTies = (Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / sIn) + 1) * nBeams;
      stirrupsKg = stirrupLengthM * totalTies * getWeightPerMeter(beam.diaStirrups);

      const subTotal = bKg + tKg + eKg + sfrKg + stirrupsKg;
      grandTotalKg += subTotal;

      [[beam.diaBottom, bKg], [beam.diaTop, tKg], [beam.diaExtra, eKg], [beam.diaSFR, sfrKg], [beam.diaStirrups, stirrupsKg]].forEach(([d, kg]) => {
        if (kg > 0) diaSummary[d as number] = (diaSummary[d as number] || 0) + (kg as number);
      });

      return { ...beam, subTotal, volM3 };
    });

    return { detailed, diaSummary, grandTotalKg, totalConcreteM3 };
  }, [beams, method, lapFactor]);

  // Feature 4: PDF with Shape Code logic (Text-based references)
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("UNIVERSAL BEAM BBS & QUANTITY REPORT", 105, 15, { align: "center" });
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Volume(m3)', 'Bottom(Shape 21)', 'Top(Shape 21)', 'Stirrup(Shape 51)', 'Total KG']],
      body: results.detailed.map(b => [
        b.grid, b.volM3.toFixed(2), 
        `${b.diaBottom}mm x ${b.numBottom}`, `${b.diaTop}mm x ${b.numTop}`, 
        `${b.diaStirrups}mm @ ${b.spacing}"`, b.subTotal.toFixed(2)
      ]),
      headStyles: { fillColor: [33, 150, 243] }
    });
    doc.save(`Universal_Beam_BBS.pdf`);
  };

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1565c0', padding: '20px', borderRadius: '15px', color: '#fff', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>UNIVERSAL BEAM CALCULATOR</h2>
        <div style={{ marginTop: '10px', fontSize: '12px' }}>Lap: {lapFactor}d | Mode: {method.toUpperCase()}</div>
      </div>

      {/* Global Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select onChange={(e) => setLapFactor(Number(e.target.value))} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 'bold' }}>
          <option value="50">50d Lap</option>
          <option value="45">45d Lap</option>
          <option value="40">40d Lap</option>
        </select>
        <button onClick={() => setMethod(method === 'excel' ? 'precision' : 'excel')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ff9800', color: '#fff', fontWeight: 'bold' }}>
          SWITCH TO {method === 'excel' ? 'PRECISION' : 'EXCEL'}
        </button>
      </div>

      {results.detailed.map(beam => {
        const isDeepBeam = (parseFloat(beam.depth) || 0) > 750; // Feature 3 logic
        return (
          <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#1e88e5', padding: '10px 15px', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
              <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold' }} />
              <div>
                <button onClick={() => duplicateBeam(beam)} style={{ marginRight: '10px', background: '#4caf50', border: 'none', color: '#fff', borderRadius: '5px', padding: '2px 8px' }}>COPY</button>
                <button onClick={() => setBeams(beams.filter(i => i.id !== beam.id))} style={{ background: '#f44336', border: 'none', color: '#fff', borderRadius: '50%', width: '24px' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <BlueInput label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
                <BlueInput label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <BlueInput label="Main Len(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
                <BlueInput label="Extra Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
              </div>
              {/* Feature 3: SFR Warning Highlight */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', padding: '5px', borderRadius: '10px', border: isDeepBeam ? '2px solid red' : 'none' }}>
                <BlueSelect label="Dia SFR" value={beam.diaSFR} onChange={v => updateBeam(beam.id, 'diaSFR', v)} options={[10, 12, 16]} />
                <BlueInput label="SFR Nos" value={beam.numSFR} onChange={v => updateBeam(beam.id, 'numSFR', v)} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <BlueSelect label="Stirrup" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} options={[8, 10, 12]} />
                <BlueInput label="Spacing" value={beam.spacing} onChange={v => updateBeam(beam.id, 'spacing', v)} />
                <div style={{ flex: 1, backgroundColor: '#e8f5e9', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block' }}>VOL (M3)</span>
                    <span style={{ fontWeight: 'bold' }}>{beam.volM3.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '3px solid #1565c0' }}>
        <h3 style={{ textAlign: 'center', marginTop: 0 }}>PROJECT TOTALS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Total Concrete:</span>
            <span style={{ fontWeight: 'bold' }}>{results.totalConcreteM3.toFixed(2)} m³</span>
        </div>
        <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
            {Object.entries(results.diaSummary).map(([d, kg]) => (
                <div key={d} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{d}mm Steel:</span>
                    <span style={{ fontWeight: 'bold' }}>{Number(kg).toFixed(2)} KG</span>
                </div>
            ))}
        </div>
      </div>

      <button onClick={addNewBeam} style={{ width: '100%', padding: '18px', marginTop: '15px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>+ ADD NEW BEAM</button>
      <button onClick={generatePDF} style={{ width: '100%', padding: '18px', marginTop: '10px', background: '#212121', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>DOWNLOAD PDF REPORT</button>
    </div>
  );
};

const BlueInput = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '10px' }}>
    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#1565c0' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const BlueSelect = ({ label, value, onChange, options }: any) => (
  <div style={{ flex: 1, backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '10px' }}>
    <label style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#1565c0' }}>{label}</label>
    <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 'bold', outline: 'none' }}>
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default UniversalBeamBBS;
