import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getWeightPerMeter = (dia: number) => (dia * dia) / 162.2; // Standard engineering constant

interface RodSet {
  dia1: number; num1: string;
  dia2: number; num2: string;
}

interface BeamData {
  id: string;
  grid: string;
  width: string;
  depth: string;
  lenMain: string;
  lenExtra: string;
  bottom: RodSet;
  top: RodSet;
  extra: RodSet;
  diaStirrups: number;
  spacing: string;
}

const BeamBBS: React.FC = () => {
  const SLAB_THICKNESS_MM = 125;

  const [beams, setBeams] = useState<BeamData[]>([
    { 
      id: '1', grid: 'B1', width: '230', depth: '380', 
      lenMain: '55.25', lenExtra: '26.7',
      bottom: { dia1: 16, num1: '3', dia2: 12, num2: '1' },
      top: { dia1: 16, num1: '2', dia2: 12, num2: '1' },
      extra: { dia1: 16, num1: '1', dia2: 12, num2: '0' },
      diaStirrups: 8, spacing: '6' 
    }
  ]);

  const addBeam = () => {
    const newBeam: BeamData = {
      ...beams[0],
      id: Date.now().toString(),
      grid: `B${beams.length + 1}`
    };
    setBeams([...beams, newBeam]);
  };

  const deleteBeam = (id: string) => {
    if (beams.length > 1) setBeams(beams.filter(b => b.id !== id));
  };

  const updateBeam = (id: string, field: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...b, [parent]: { ...(b as any)[parent], [child]: val } };
      }
      return { ...b, [field]: val };
    }));
  };

  const results = useMemo(() => {
    const diaSummary: Record<number, number> = { 8:0, 10:0, 12:0, 16:0, 20:0, 25:0 };
    let totalConcreteM3 = 0;

    const detailed = beams.map(beam => {
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * 0.3048;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * 0.3048;
      const sIn = parseFloat(beam.spacing) || 6;

      const volM3 = wM * (dM - (SLAB_THICKNESS_MM / 1000)) * lMainM;
      totalConcreteM3 += volM3;

      const calcKg = (rod: RodSet, len: number) => {
        const k1 = len * (parseFloat(rod.num1) || 0) * getWeightPerMeter(rod.dia1);
        const k2 = len * (parseFloat(rod.num2) || 0) * getWeightPerMeter(rod.dia2);
        return { k1, k2, d1: rod.dia1, d2: rod.dia2 };
      };

      const b = calcKg(beam.bottom, lMainM);
      const t = calcKg(beam.top, lMainM);
      const e = calcKg(beam.extra, lExtraM);

      const stirrupLenM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const totalTies = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / sIn) + 1;
      const stirrupKg = stirrupLenM * totalTies * getWeightPerMeter(beam.diaStirrups);

      [b, t, e].forEach(r => {
        diaSummary[r.d1] = (diaSummary[r.d1] || 0) + r.k1;
        diaSummary[r.d2] = (diaSummary[r.d2] || 0) + r.k2;
      });
      diaSummary[beam.diaStirrups] += stirrupKg;

      return { ...beam, volM3, totalBeamKg: b.k1+b.k2+t.k1+t.k2+e.k1+e.k2+stirrupKg };
    });

    return { detailed, diaSummary, totalConcreteM3 };
  }, [beams]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("STEEL REINFORCEMENT & CONCRETE REPORT", 105, 15, { align: "center" });
    
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Width', 'Depth', 'Main Len', 'Vol (m3)', 'Total Steel']],
      body: results.detailed.map(b => [b.grid, b.width, b.depth, b.lenMain, b.volM3.toFixed(3), b.totalBeamKg.toFixed(2) + ' kg']),
    });

    const summaryData = Object.entries(results.diaSummary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Steel`, `${kg.toFixed(2)} KG`]);
    
    doc.text("PROJECT TOTALS", 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      body: [['Total Concrete', `${results.totalConcreteM3.toFixed(3)} m³`], ...summaryData],
      theme: 'grid'
    });
    
    doc.save("Beam_BBS_Report.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1565c0', color: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>BEAM BBS CODING</h2>
        <p style={{ fontSize: '12px', margin: '5px 0' }}>Concrete = W * (D - 125mm) * Main Length</p>
      </header>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '2px solid #e3f2fd', paddingBottom: '10px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ fontWeight: 'bold', fontSize: '18px', border: 'none', color: '#1565c0', width: '80px' }} />
            <button onClick={() => deleteBeam(beam.id)} style={{ background: '#ff5252', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <InputBox label="Width (mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <InputBox label="Depth (mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <InputBox label="Main Len (ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
             <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#555' }}>REINFORCEMENT (Dia | Nos)</h4>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <DualRow label="Bottom (Main)" rod={beam.bottom} onUpdate={(f, v) => updateBeam(beam.id, `bottom.${f}`, v)} />
                <DualRow label="Top (Main)" rod={beam.top} onUpdate={(f, v) => updateBeam(beam.id, `top.${f}`, v)} />
                <DualRow label="Extra Rods" rod={beam.extra} onUpdate={(f, v) => updateBeam(beam.id, `extra.${f}`, v)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <InputBox label="Extra Len (ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
                    <InputBox label="Stirrup Dia" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} />
                </div>
             </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={addBeam} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>+ ADD BEAM</button>
        <button onClick={downloadPDF} style={{ flex: 1, padding: '15px', backgroundColor: '#212121', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>DOWNLOAD PDF</button>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #1565c0' }}>
        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>PROJECT TOTALS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
            <span>Total Concrete:</span> <strong>{results.totalConcreteM3.toFixed(3)} m³</strong>
        </div>
        {Object.entries(results.diaSummary).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
            <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const InputBox = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', display: 'block', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const DualRow = ({ label, rod, onUpdate }: any) => {
  const active = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #dee2e6', padding: '8px', borderRadius: '8px', backgroundColor: '#fff' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>{label}</span>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" placeholder="Dia" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
        <input type="number" placeholder="Nos" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', background: active(rod.num1) ? '#90caf9' : '#e0e0e0', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <input type="number" placeholder="Dia" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#bbdefb' : '#f5f5f5', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
        <input type="number" placeholder="Nos" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', background: active(rod.num2) ? '#90caf9' : '#e0e0e0', border: 'none', borderRadius: '4px', textAlign: 'center', padding: '4px' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
