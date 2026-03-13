import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- CONSTANTS MATCHING YOUR EXCEL EXACTLY ---
const BUNDLE_DATA: Record<number, { weight: number; rods: number }> = {
  8:  { weight: 47.4,  rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.3,  rods: 1 }
};

const DIVIDER = 3.281; // Feet to Meters as per your sheet
const ROD_LEN = 12;    // Standard Rod Length

interface RodEntry { dia: number; nos: string; }
interface Beam {
  id: number; grid: string; w: string; d: string; mainFt: string; exFt: string; spacing: string;
  bottom1: RodEntry; bottom2: RodEntry;
  top1: RodEntry; top2: RodEntry;
  ex1: RodEntry; ex2: RodEntry;
}

const BeamBBS = () => {
  const [beams, setBeams] = useState<Beam[]>([createEmptyBeam(1)]);

  function createEmptyBeam(id: number): Beam {
    return {
      id, grid: `B${id}`, w: '230', d: '380', mainFt: '60', exFt: '30', spacing: '6',
      bottom1: { dia: 16, nos: '1' }, bottom2: { dia: 12, nos: '1' },
      top1: { dia: 16, nos: '1' }, top2: { dia: 12, nos: '1' },
      ex1: { dia: 16, nos: '1' }, ex2: { dia: 12, nos: '1' }
    };
  }

  const addBeam = () => setBeams([...beams, createEmptyBeam(Date.now())]);
  const deleteBeam = (id: number) => setBeams(beams.filter(b => b.id !== id));

  const updateBeam = (id: number, path: string, val: string) => {
    setBeams(beams.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b };
      if (path.includes('.')) {
        const [p, c] = path.split('.');
        (newB as any)[p] = { ...(newB as any)[p], [c]: val };
      } else {
        (newB as any)[path] = val;
      }
      return newB;
    }));
  };

  // --- CALCULATION LOGIC MATCHING EXCEL ROW-BY-ROW ---
  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let totalConcrete = 0;

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / DIVIDER;
      const L_Ex = (parseFloat(b.exFt) || 0) / DIVIDER;
      totalConcrete += (parseFloat(b.w) / 1000) * (parseFloat(b.d) / 1000) * L_Main;

      const calcKg = (dia: number, nos: string, lenM: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !BUNDLE_DATA[dia]) return 0;
        const config = BUNDLE_DATA[dia];
        return ((lenM * n) / (config.rods * ROD_LEN)) * config.weight;
      };

      // Exact Excel Summation Procedure
      summary[b.bottom1.dia] += calcKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += calcKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia] += calcKg(b.top1.dia, b.top1.nos, L_Main);
      summary[b.top2.dia] += calcKg(b.top2.dia, b.top2.nos, L_Main);
      summary[b.ex1.dia] += calcKg(b.ex1.dia, b.ex1.nos, L_Main); // Sheet logic for ex rods
      summary[b.ex2.dia] += calcKg(b.ex2.dia, b.ex2.nos, L_Ex);

      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += calcKg(8, stirrupQty.toString(), 3.5 / DIVIDER);
    });
    return { summary, totalConcrete };
  }, [beams]);

  // --- ACTIONS ---
  const shareWhatsApp = () => {
    let text = `*Beam BBS Summary*%0A`;
    Object.entries(totals.summary).forEach(([dia, kg]) => {
      if (kg > 0) text += `${dia}mm: ${kg.toFixed(2)} KG%0A`;
    });
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const downloadPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("Structural Steel Summary", 14, 15);
    const rows = Object.entries(totals.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Steel`, `${kg.toFixed(2)} KG`]);
    doc.autoTable({ head: [['Material', 'Total Weight']], body: rows, startY: 20 });
    doc.save("Beam_BBS_Report.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#1565c0', color: 'white', padding: '15px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>BEAM BBS PRO</h2>
      </div>

      <div style={{ padding: '15px' }}>
        {beams.map((b, idx) => (
          <div key={b.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <input value={b.grid} onChange={(e) => updateBeam(b.id, 'grid', e.target.value)} style={{ border: 'none', color: '#1565c0', fontWeight: 'bold', fontSize: '18px', width: '60px' }} />
              <button onClick={() => deleteBeam(b.id)} style={{ backgroundColor: '#ffebee', color: '#c62828', border: 'none', padding: '5px 10px', borderRadius: '6px' }}>Delete</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              <Input label="Width" val={b.w} set={(v) => updateBeam(b.id, 'w', v)} />
              <Input label="Depth" val={b.d} set={(v) => updateBeam(b.id, 'd', v)} />
              <Input label="Main(ft)" val={b.mainFt} set={(v) => updateBeam(b.id, 'mainFt', v)} />
            </div>

            <Section label="Bottom" entry1={b.bottom1} entry2={b.bottom2} set1={(f, v) => updateBeam(b.id, `bottom1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `bottom2.${f}`, v)} />
            <Section label="Top" entry1={b.top1} entry2={b.top2} set1={(f, v) => updateBeam(b.id, `top1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `top2.${f}`, v)} />
            <Section label="Extra" entry1={b.ex1} entry2={b.ex2} set1={(f, v) => updateBeam(b.id, `ex1.${f}`, v)} set2={(f, v) => updateBeam(b.id, `ex2.${f}`, v)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <Input label="Ex Len(ft)" val={b.exFt} set={(v) => updateBeam(b.id, 'exFt', v)} />
              <Input label="Spacing(in)" val={b.spacing} set={(v) => updateBeam(b.id, 'spacing', v)} />
            </div>
          </div>
        ))}

        <button onClick={addBeam} style={{ width: '100%', padding: '12px', backgroundColor: 'white', border: '2px dashed #1565c0', color: '#1565c0', borderRadius: '10px', fontWeight: 'bold', marginBottom: '20px' }}>+ Add New Beam</button>

        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', border: '2px solid #1565c0' }}>
          <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Total Concrete:</span> <strong>{totals.totalConcrete.toFixed(3)} m³</strong>
          </div>
          {Object.entries(totals.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{dia}mm Steel:</span> <strong>{kg.toFixed(2)} KG</strong>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
            <button onClick={shareWhatsApp} style={{ padding: '12px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>WhatsApp</button>
            <button onClick={downloadPDF} style={{ padding: '12px', backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Print PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, val, set }: any) => (
  <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px' }}>
    <label style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold' }}>{label}</label>
    <input type="number" value={val} onChange={(e) => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const Section = ({ label, entry1, entry2, set1, set2 }: any) => (
  <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>{label}</div>
    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
      <input type="number" value={entry1.dia} onChange={e => set1('dia', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
      <input type="number" value={entry1.nos} onChange={e => set1('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#1565c0', color: 'white', textAlign: 'center' }} />
    </div>
    <div style={{ display: 'flex', gap: '5px' }}>
      <input type="number" value={entry2.dia} onChange={e => set2('dia', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
      <input type="number" value={entry2.nos} onChange={e => set2('nos', e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#1565c0', color: 'white', textAlign: 'center' }} />
    </div>
  </div>
);

export default BeamBBS;
