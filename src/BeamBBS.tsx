import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Matches Excel standard weight constant
const getWeightPerMeter = (dia: number) => (dia * dia) / 162.2;

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
  const SLAB_THICK_MM = 125;
  const FT_TO_M = 0.3048;

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

  const updateBeam = useCallback((id: string, field: string, val: any) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...b, [parent]: { ...(b as any)[parent], [child]: val } };
      }
      return { ...b, [field]: val };
    }));
  }, []);

  const results = useMemo(() => {
    const summary: Record<number, number> = { 8:0, 10:0, 12:0, 16:0, 20:0, 25:0 };
    let totalVol = 0;

    const detailed = beams.map(beam => {
      const wM = (parseFloat(beam.width) || 0) / 1000;
      const dM = (parseFloat(beam.depth) || 0) / 1000;
      const lMainM = (parseFloat(beam.lenMain) || 0) * FT_TO_M;
      const lExtraM = (parseFloat(beam.lenExtra) || 0) * FT_TO_M;
      const spacingIn = parseFloat(beam.spacing) || 6;

      // Excel Concrete Logic
      const vol = wM * (dM - (SLAB_THICK_MM / 1000)) * lMainM;
      totalVol += vol;

      // Steel Logic matching Excel Bundle Weights
      const calcKg = (rod: RodSet, len: number) => {
        const k1 = len * (parseFloat(rod.num1) || 0) * getWeightPerMeter(rod.dia1);
        const k2 = len * (parseFloat(rod.num2) || 0) * getWeightPerMeter(rod.dia2);
        summary[rod.dia1] += k1;
        summary[rod.dia2] += k2;
        return k1 + k2;
      };

      const bKg = calcKg(beam.bottom, lMainM);
      const tKg = calcKg(beam.top, lMainM);
      const eKg = calcKg(beam.extra, lExtraM);

      // Stirrup Logic matching your Excel "8mm stirrups Cutting Length"
      const stirrupCutM = (((wM * 1000 - 80) * 2) + ((dM * 1000 - 80) * 2) + 200) / 1000;
      const stirrupQty = Math.ceil(((parseFloat(beam.lenMain) || 0) * 12) / spacingIn) + 1;
      const stirrupKg = stirrupCutM * stirrupQty * getWeightPerMeter(beam.diaStirrups);
      summary[beam.diaStirrups] += stirrupKg;

      return { ...beam, vol, totalBeamKg: bKg + tKg + eKg + stirrupKg };
    });

    return { detailed, summary, totalVol };
  }, [beams]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("BEAM BBS REPORT", 105, 15, { align: "center" });
    
    autoTable(doc, {
      startY: 25,
      head: [['Grid', 'Size (mm)', 'Main (ft)', 'Vol (m3)', 'Total Steel (kg)']],
      body: results.detailed.map(b => [`${b.grid}`, `${b.width}x${b.depth}`, b.lenMain, b.vol.toFixed(3), b.totalBeamKg.toFixed(2)]),
      theme: 'grid',
      headStyles: { fillColor: [21, 101, 192] }
    });

    doc.text("CONSOLIDATED TOTALS", 14, (doc as any).lastAutoTable.finalY + 15);
    const summaryRows = Object.entries(results.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Rebar`, `${kg.toFixed(2)} KG`]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      body: [['Total Concrete', `${results.totalVol.toFixed(3)} m³`], ...summaryRows],
    });

    doc.save(`${Date.now()}_Beam_BBS.pdf`);
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ backgroundColor: '#1565c0', color: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>BEAM BBS</h1>
        <small>Seamless Excel Integrated Logic</small>
      </div>

      {beams.map(beam => (
        <div key={beam.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <input value={beam.grid} onChange={e => updateBeam(beam.id, 'grid', e.target.value)} style={{ border: 'none', fontWeight: 'bold', fontSize: '18px', color: '#1565c0', width: '100px' }} />
            <div style={{ textAlign: 'right' }}>
               <span style={{ fontSize: '12px', color: '#666' }}>Vol: </span>
               <span style={{ fontWeight: 'bold' }}>{results.detailed.find(d => d.id === beam.id)?.vol.toFixed(3)} m³</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            <InputItem label="Width(mm)" value={beam.width} onChange={v => updateBeam(beam.id, 'width', v)} />
            <InputItem label="Depth(mm)" value={beam.depth} onChange={v => updateBeam(beam.id, 'depth', v)} />
            <InputItem label="Main Len(ft)" value={beam.lenMain} onChange={v => updateBeam(beam.id, 'lenMain', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RebarRow label="Bottom (Main)" rod={beam.bottom} onUpdate={(f, v) => updateBeam(beam.id, `bottom.${f}`, v)} />
            <RebarRow label="Top (Main)" rod={beam.top} onUpdate={(f, v) => updateBeam(beam.id, `top.${f}`, v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <RebarRow label="Extra Rods" rod={beam.extra} onUpdate={(f, v) => updateBeam(beam.id, `extra.${f}`, v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <InputItem label="Extra Len(ft)" value={beam.lenExtra} onChange={v => updateBeam(beam.id, 'lenExtra', v)} />
              <InputItem label="Stirrup Dia" value={beam.diaStirrups} onChange={v => updateBeam(beam.id, 'diaStirrups', v)} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ position: 'sticky', bottom: '15px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setBeams([...beams, { ...beams[0], id: Date.now().toString(), grid: 'New' }])} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#43a047', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>+ ADD BEAM</button>
        <button onClick={downloadPDF} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#263238', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>DOWNLOAD PDF</button>
      </div>
    </div>
  );
};

const InputItem = ({ label, value, onChange }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '6px' }}>
    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#1565c0', display: 'block' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const RebarRow = ({ label, rod, onUpdate }: any) => {
  const isSelected = (val: any) => (parseFloat(val) || 0) > 0;
  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '8px', borderRadius: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#444' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
        <input placeholder="Dia" type="number" value={rod.dia1} onChange={e => onUpdate('dia1', e.target.value)} style={{ width: '50%', padding: '5px', borderRadius: '4px', border: 'none', backgroundColor: isSelected(rod.num1) ? '#bbdefb' : '#f5f5f5', textAlign: 'center' }} />
        <input placeholder="Nos" type="number" value={rod.num1} onChange={e => onUpdate('num1', e.target.value)} style={{ width: '50%', padding: '5px', borderRadius: '4px', border: 'none', backgroundColor: isSelected(rod.num1) ? '#64b5f6' : '#eeeeee', textAlign: 'center', color: isSelected(rod.num1) ? 'white' : 'black' }} />
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input placeholder="Dia" type="number" value={rod.dia2} onChange={e => onUpdate('dia2', e.target.value)} style={{ width: '50%', padding: '5px', borderRadius: '4px', border: 'none', backgroundColor: isSelected(rod.num2) ? '#bbdefb' : '#f5f5f5', textAlign: 'center' }} />
        <input placeholder="Nos" type="number" value={rod.num2} onChange={e => onUpdate('num2', e.target.value)} style={{ width: '50%', padding: '5px', borderRadius: '4px', border: 'none', backgroundColor: isSelected(rod.num2) ? '#64b5f6' : '#eeeeee', textAlign: 'center', color: isSelected(rod.num2) ? 'white' : 'black' }} />
      </div>
    </div>
  );
};

export default BeamBBS;
