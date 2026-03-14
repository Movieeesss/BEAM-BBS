import React, { useState, useMemo, CSSProperties } from 'react';

/**
 * UNIQ DESIGNS - STRUCTURAL BBS AUTOMATION
 * Calibrated for 100% Excel Match
 */

interface RebarData {
  dia: number;
  nos: string;
}

interface Beam {
  id: number;
  grid: string;
  w: string;
  d: string;
  mainFt: string;
  exFt: string;
  spacing: string;
  bottom1: RebarData;
  bottom2: RebarData;
  top1: RebarData;
  top2: RebarData;
  ex1: RebarData;
  ex2: RebarData;
}

const REFERENCE_DATA: Record<number, { unitWeight: number; bundleWeight: number; rodsInBundle: number }> = {
  8:  { unitWeight: 0.400, bundleWeight: 47.4,  rodsInBundle: 10 },
  10: { unitWeight: 0.618, bundleWeight: 51.87, rodsInBundle: 7 },
  12: { unitWeight: 0.890, bundleWeight: 53.35, rodsInBundle: 5 },
  16: { unitWeight: 1.590, bundleWeight: 56.88, rodsInBundle: 3 },
  20: { unitWeight: 2.470, bundleWeight: 59.26, rodsInBundle: 2 },
  25: { unitWeight: 3.860, bundleWeight: 46.3,  rodsInBundle: 1 }
};

const FEET_TO_METER = 3.281; 
const ROD_LENGTH_METER = 12.19; 

const UniqDesignsBBS: React.FC = () => {
  const [beams, setBeams] = useState<Beam[]>([
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
      ex2: { dia: 12, nos: '1' }
    }
  ]);

  const updateField = (id: number, path: string, val: string | number) => {
    setBeams(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b } as any;
      if (path.includes('.')) {
        const [sec, f] = path.split('.');
        newB[sec] = { ...newB[sec], [f]: val };
      } else {
        newB[path] = val;
      }
      return newB as Beam;
    }));
  };

  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach(b => {
      const L_Main = (parseFloat(b.mainFt) || 0) / FEET_TO_METER;
      const L_Ex = (parseFloat(b.exFt) || 0) / FEET_TO_METER;

      const getKg = (dia: number, nos: string, lenM: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0 || !REFERENCE_DATA[dia]) return 0;
        const ref = REFERENCE_DATA[dia];
        const reqBundles = (lenM * n) / (ROD_LENGTH_METER * ref.rodsInBundle);
        return reqBundles * ref.bundleWeight;
      };

      summary[b.bottom1.dia] += getKg(b.bottom1.dia, b.bottom1.nos, L_Main);
      summary[b.bottom2.dia] += getKg(b.bottom2.dia, b.bottom2.nos, L_Main);
      summary[b.top1.dia]    += getKg(b.top1.dia,    b.top1.nos,    L_Main);
      summary[b.top2.dia]    += getKg(b.top2.dia,    b.top2.nos,    L_Main);
      summary[b.ex1.dia]     += getKg(b.ex1.dia,     b.ex1.nos,     L_Main);
      summary[b.ex2.dia]     += getKg(b.ex2.dia,     b.ex2.nos,     L_Ex);

      const stirrupQty = Math.floor(((parseFloat(b.mainFt) || 0) * 12) / (parseFloat(b.spacing) || 6)) + 1;
      summary[8] += getKg(8, stirrupQty.toString(), 3.5 / FEET_TO_METER);
    });
    return summary;
  }, [beams]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>UNIQ DESIGNS</h1>
        <p style={styles.subtitle}>Structural Steel BBS Automation</p>
      </header>

      {beams.map(b => (
        <div key={b.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <input 
              value={b.grid} 
              onChange={e => updateField(b.id, 'grid', e.target.value)} 
              style={styles.gridInput} 
            />
            <button 
              onClick={() => setBeams(beams.filter(x => x.id !== b.id))} 
              style={styles.removeBtn}
            >REMOVE</button>
          </div>

          <div style={styles.dimRow}>
            <Field label="W(mm)" val={b.w} set={v => updateField(b.id, 'w', v)} />
            <Field label="D(mm)" val={b.d} set={v => updateField(b.id, 'd', v)} />
            <Field label="MAIN(FT)" val={b.mainFt} set={v => updateField(b.id, 'mainFt', v)} />
          </div>

          <Section title="BOTTOM REBAR" d1={b.bottom1} d2={b.bottom2} bId={b.id} path="bottom" update={updateField} color="#e7f1ff" />
          <Section title="TOP REBAR" d1={b.top1} d2={b.top2} bId={b.id} path="top" update={updateField} color="#fff3cd" />
          <Section title="EXTRA RODS" d1={b.ex1} d2={b.ex2} bId={b.id} path="ex" update={updateField} color="#d1e7dd" />

          <div style={styles.dimRow}>
            <Field label="EX LEN(FT)" val={b.exFt} set={v => updateField(b.id, 'exFt', v)} />
            <Field label="SPACING(IN)" val={b.spacing} set={v => updateField(b.id, 'spacing', v)} />
          </div>
        </div>
      ))}

      <button 
        onClick={() => setBeams([...beams, {...beams[0], id: Date.now(), grid: `B${beams.length + 1}`}])} 
        style={styles.addBtn}
      >+ ADD ANOTHER BEAM</button>

      <footer style={styles.footer}>
        <div style={styles.footerLabel}>PROJECT TOTALS (KG)</div>
        <div style={styles.statRow}>
          <Stat label="8mm" val={totals[8]} />
          <Stat label="12mm" val={totals[12]} />
          <Stat label="16mm" val={totals[16]} />
        </div>
      </footer>
    </div>
  );
};

// --- Sub-Components ---

const Field: React.FC<{ label: string; val: string; set: (v: string) => void }> = ({ label, val, set }) => (
  <div style={styles.fieldBox}>
    <label style={styles.fieldLabel}>{label}</label>
    <input 
      type="number" 
      value={val} 
      onChange={e => set(e.target.value)} 
      style={styles.fieldInput} 
    />
  </div>
);

const Section: React.FC<{ title: string; d1: RebarData; d2: RebarData; bId: number; path: string; update: any; color: string }> = ({ title, d1, d2, bId, path, update, color }) => (
  <div style={{ ...styles.section, backgroundColor: color }}>
    <div style={styles.sectionTitle}>{title}</div>
    <div style={styles.rebarRow}>
      <RebarPair dia={d1.dia} nos={d1.nos} setDia={v => update(bId, `${path}1.dia`, v)} setNos={v => update(bId, `${path}1.nos`, v)} />
      <RebarPair dia={d2.dia} nos={d2.nos} setDia={v => update(bId, `${path}2.dia`, v)} setNos={v => update(bId, `${path}2.nos`, v)} />
    </div>
  </div>
);

const RebarPair: React.FC<{ dia: number; nos: string; setDia: (v: number) => void; setNos: (v: string) => void }> = ({ dia, nos, setDia, setNos }) => (
  <div style={styles.rebarPair}>
    <select value={dia} onChange={e => setDia(parseInt(e.target.value))} style={styles.select}>
      {[8, 10, 12, 16, 20, 25].map(x => <option key={x} value={x}>{x}ø</option>)}
    </select>
    <input 
      type="number" 
      value={nos} 
      onChange={e => setNos(e.target.value)} 
      style={styles.nosInput} 
    />
  </div>
);

const Stat: React.FC<{ label: string; val: number }> = ({ label, val }) => (
  <div style={styles.statBox}>
    <div style={styles.statLabel}>{label}</div>
    <div style={styles.statVal}>{val.toFixed(2)}</div>
  </div>
);

// --- STYLES OBJECT WITH FIXED TYPESCRIPT TYPES ---
const styles: Record<string, CSSProperties> = {
  container: { maxWidth: '800px', margin: '0 auto', background: '#f4f7f9', minHeight: '100vh', padding: '10px', paddingBottom: '120px', fontFamily: 'Segoe UI, Roboto, sans-serif' },
  header: { background: '#0d6efd', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '24px' },
  subtitle: { margin: '5px 0 0', fontSize: '12px', opacity: 0.8 },
  card: { background: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  gridInput: { border: 'none', borderBottom: '2px solid #0d6efd', fontSize: '18px', fontWeight: 'bold', width: '80px', color: '#0d6efd', outline: 'none' },
  removeBtn: { border: 'none', background: 'none', color: '#dc3545', fontSize: '12px', fontWeight: 'bold' },
  dimRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
  fieldBox: { background: '#f8fafc', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  fieldLabel: { fontSize: '10px', fontWeight: 'bold', display: 'block', color: '#64748b', marginBottom: '4px' },
  fieldInput: { width: '100%', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '16px', outline: 'none', textAlign: 'center' },
  section: { padding: '12px', borderRadius: '12px', marginBottom: '12px' },
  sectionTitle: { fontSize: '11px', fontWeight: '800', marginBottom: '8px', color: '#334155' },
  rebarRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  rebarPair: { display: 'flex', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' },
  select: { border: 'none', background: '#f1f5f9', padding: '5px 10px', fontSize: '14px', borderRight: '1px solid #cbd5e1' },
  nosInput: { width: '100%', border: 'none', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', outline: 'none' },
  addBtn: { width: '100%', padding: '15px', borderRadius: '12px', background: 'white', border: '2px dashed #0d6efd', color: '#0d6efd', fontWeight: 'bold' },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0d6efd', color: 'white', padding: '15px 20px', borderRadius: '25px 25px 0 0', zIndex: 100 },
  footerLabel: { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', opacity: 0.9 },
  statRow: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  statBox: { textAlign: 'center' },
  statLabel: { fontSize: '11px', opacity: 0.8, marginBottom: '2px' },
  statVal: { fontSize: '20px', fontWeight: 'bold' }
};

export default UniqDesignsBBS;
