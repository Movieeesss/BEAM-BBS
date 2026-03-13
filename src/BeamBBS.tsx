import React, { useState, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- DATA FROM YOUR EXCEL SWITCH FORMULAS (Verified from Images) ---
const BUNDLE_DATA: Record<number, { weight: number; rods: number }> = {
  8:  { weight: 47.4,  rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.3,  rods: 1 }
};

const DIVIDER = 3.281; // Feet to Meters (Matches your Excel divider)
const ROD_LEN = 12;    // Full rod length in meters

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

  const updateBeam = useCallback((id: number, path: string, val: string) => {
    setBeams(prev => prev.map(b => {
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
  }, []);

  // --- CALCULATION ENGINE: MATCHES EXCEL COLUMNS AB-AM EXACTLY ---
  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    let totalConcrete = 0;

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / DIVIDER;
      const L_Ex = (parseFloat(b.exFt) || 0) / DIVIDER;
      totalConcrete += (parseFloat(b.w) / 1000) * (parseFloat(b.d) / 1000) * L_Main;

      // EXCEL FORMULA: ( (LengthM * Nos) / (RodsInBundle * 12) ) * BundleWeight
      const calcKg = (dia: number, nos: string, lenM: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !BUNDLE_DATA[dia]) return 0;
        const config = BUNDLE_DATA[dia];
        
        // Match Excel 'Required Bundles' decimal column logic
        const bundles = (lenM * n) / (config.rods * ROD_LEN);
        // Multiply by bundle weight to get final KG per entry
        return bundles * config.weight;
      };

      // Summing EVERY category independently just like your Excel Columns AH to AM
      summary[b.bottom1.dia] += calcKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += calcKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia]    += calcKg(b.top1.dia,    b.top1.nos,    L_Main);
      summary[b.top2.dia]    += calcKg(b.top2.dia,    b.top2.nos,    L_Main);
      summary[b.ex1.dia]     += calcKg(b.ex1.dia,     b.ex1.nos,     L_Main); 
      summary[b.ex2.dia]     += calcKg(b.ex2.dia,     b.ex2.nos,     L_Ex);

      // Stirrups (8mm) using 3.5ft cut length from Excel
      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += calcKg(8, stirrupQty.toString(), 3.5 / DIVIDER);
    });

    return { summary, totalConcrete };
  }, [beams]);

  // --- ACTIONS ---
  const shareWhatsApp = () => {
    let text = `*Beam BBS Project Summary*%0A`;
    Object.entries(totals.summary).forEach(([dia, kg]) => {
      if (kg > 0) text += `${dia}mm Steel: ${kg.toFixed(2)} KG%0A`;
    });
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const downloadPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text("Structural Design BBS Report", 14, 20);
    const rows = Object.entries(totals.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Reinforcement`, `${kg.toFixed(2)} KG`]);
    doc.autoTable({ head: [['Item Description', 'Total Weight']], body: rows, startY: 30 });
    doc.save("Beam_BBS_Excel_Logic.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' }}>
      <header style={{ backgroundColor: '#1e40af', color: 'white', padding: '20px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>BEAM BBS - PROFESSIONAL</h1>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '15px' }}>
        {beams.map((b) => (
          <div key={b.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', marginBottom: '25px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <input value={b.grid} onChange={(e) => updateBeam(b.id, 'grid', e.target.value)} style={{ border: 'none', color: '#1e40af', fontWeight: 'bold', fontSize: '20px', width: '100px', borderBottom: '2px solid #e2e8f0' }} />
              <button onClick={() => deleteBeam(b.id)} style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}>REMOVE</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <Input label="Width(mm)" val={b.w} set={(v:any) => updateBeam(b.id, 'w', v)} />
              <Input label="Depth(mm)" val={b.d} set={(v:any) => updateBeam(b.id, 'd', v)} />
              <Input label="Main(ft)" val={b.mainFt} set={(v:any) => updateBeam(b.id, 'mainFt', v)} />
            </div>

            <Section label="BOTTOM REINFORCEMENT" entry1={b.bottom1} entry2={b.bottom2} set1={(f:any, v:any) => updateBeam(b.id, `bottom1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `bottom2.${f}`, v)} />
            <Section label="TOP REINFORCEMENT" entry1={b.top1} entry2={b.top2} set1={(f:any, v:any) => updateBeam(b.id, `top1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `top2.${f}`, v)} />
            <Section label="EXTRA REINFORCEMENT" entry1={b.ex1} entry2={b.ex2} set1={(f:any, v:any) => updateBeam(b.id, `ex1.${f}`, v)} set2={(f:any, v:any) => updateBeam(b.id, `ex2.${f}`, v)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '15px' }}>
              <Input label="Extra Len(ft)" val={b.exFt} set={(v:any) => updateBeam(b.id, 'exFt', v)} />
              <Input label="Spacing(in)" val={b.spacing} set={(v:any) => updateBeam(b.id, 'spacing', v)} />
            </div>
          </div>
        ))}

        <button onClick={addBeam} style={{ width: '100%', padding: '15px', background: 'white', border: '2px dashed #1e40af', color: '#1e40af', borderRadius: '12px', fontWeight: 'bold', marginBottom: '30px', cursor: 'pointer', fontSize: '16px' }}>+ ADD NEW BEAM GRID</button>

        <div style={{ backgroundColor: '#1e40af', borderRadius: '20px', padding: '25px', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '20px', letterSpacing: '1px' }}>ESTIMATION SUMMARY</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
            <span>Concrete Volume:</span> <strong>{totals.totalConcrete.toFixed(3)} m³</strong>
          </div>
          {Object.entries(totals.summary).map(([dia, kg]) => (kg > 0) && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '18px' }}>
              <span>{dia}mm Steel weight:</span> <strong>{kg.toFixed(2)} KG</strong>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '25px' }}>
            <button onClick={shareWhatsApp} style={{ padding: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>WhatsApp</button>
            <button onClick={downloadPDF} style={{ padding: '16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Save PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, val, set }: any) => (
  <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{label}</label>
    <input type="number" value={val} onChange={(e) => set(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '17px', outline: 'none', color: '#1e293b' }} />
  </div>
);

const Section = ({ label, entry1, entry2, set1, set2 }: any) => {
  const isAct = (n: any) => (parseFloat(n) || 0) > 0;
  return (
    <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '15px', marginBottom: '15px', backgroundColor: '#f8fafc' }}>
      <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '12px', color: '#475569', textAlign: 'center' }}>{label}</div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input type="number" value={entry1.dia} onChange={e => set1('dia', e.target.value)} style={{ width: '50%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }} placeholder="Dia" />
        <input type="number" value={entry1.nos} onChange={e => set1('nos', e.target.value)} style={{ width: '50%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: isAct(entry1.nos) ? '#3b82f6' : '#e2e8f0', color: isAct(entry1.nos) ? 'white' : '#64748b', textAlign: 'center', fontWeight: 'bold' }} placeholder="Nos" />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input type="number" value={entry2.dia} onChange={e => set2('dia', e.target.value)} style={{ width: '50%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }} placeholder="Dia" />
        <input type="number" value={entry2.nos} onChange={e => set2('nos', e.target.value)} style={{ width: '50%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: isAct(entry2.nos) ? '#3b82f6' : '#e2e8f0', color: isAct(entry2.nos) ? 'white' : '#64748b', textAlign: 'center', fontWeight: 'bold' }} placeholder="Nos" />
      </div>
    </div>
  );
};

export default BeamBBS;
