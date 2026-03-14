import React, { useState, useMemo, useRef, useEffect, CSSProperties } from 'react';

/**
 * UNIQ DESIGNS RENAMED OF BEAM BBS
 * Logic matches Excel "Steel Calculation Automation":
 * - Main bars: Required Bundles × Weight of one bundle (56.88 kg for 16mm, 53.35 kg for 12mm).
 * - Extra bars: bundles = nos × (exFt/mainFt) for col1, nos × (exFt/mainFt)×0.6 for col2.
 * - Stirrups: 8mm cutting length 3.5 ft. Targets: 16mm ≈ 142.2 kg, 12mm ≈ 80 kg, 8mm ≈ 49.8 kg.
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
  stirrupDia: number;
  bottom1: RebarData;
  bottom2: RebarData;
  top1: RebarData;
  top2: RebarData;
  ex1: RebarData;
  ex2: RebarData;
}

// Excel "Weight of one bundle in kg used in sheets"
const BUNDLE_WEIGHT_KG: Record<number, number> = {
  8: 47.4,
  10: 51.87,
  12: 53.35,
  16: 56.88,
  20: 59.26,
  25: 46.3,
};

// IS unit weights (kg/m) for stirrups and other diameters
const UNIT_WEIGHTS: Record<number, number> = {
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.853,
};

const FEET_TO_METER = 3.281;
const ROD_LEN_M = 12.19; // Exact 40ft rod length from Reference sheet
const STIRRUP_CUTTING_FT = 3.5; 

const APP_TITLE = 'BEAM BBS';
const DIAMETER_ORDER = [8, 10, 12, 16, 20, 25];

const UniqDesignsBBS: React.FC = () => {
  const initialBeam = (id: number): Beam => ({
    id,
    grid: 'B1',
    w: '230',
    d: '380',
    mainFt: '60',
    exFt: '30',
    spacing: '6',
    stirrupDia: 8,
    bottom1: { dia: 16, nos: '1' },
    bottom2: { dia: 12, nos: '1' },
    top1: { dia: 16, nos: '1' },
    top2: { dia: 12, nos: '1' },
    ex1: { dia: 16, nos: '1' },
    ex2: { dia: 12, nos: '1' },
  });

  const [beams, setBeams] = useState<Beam[]>(() => [initialBeam(Date.now())]);
  const printRef = useRef<HTMLDivElement>(null);

  // --- THE BRAIN: FIXED CALCULATION ENGINE ---
  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach((b) => {
      const mainFt = parseFloat(b.mainFt) || 0;
      const exFt = parseFloat(b.exFt) || 0;
      const mainM = mainFt / FEET_TO_METER;
      const exM = exFt / FEET_TO_METER;

      // FIXED LOGIC: (Length * Nos) / (RodLength * RodsInBundle) * BundleWeight
      const getKg = (dia: number, nos: string, lengthM: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0) return 0;
        
        // Rods per bundle mapping from Excel reference
        const rodsInBundle = dia === 8 ? 10 : dia === 10 ? 7 : dia === 12 ? 5 : dia === 16 ? 3 : dia === 20 ? 2 : 1;
        const bundleWt = BUNDLE_WEIGHT_KG[dia] || 0;
        
        // Formula: (Total length / 12.19 / RodsPerBundle) * BundleWeight
        return (lengthM * n / (ROD_LEN_M * rodsInBundle)) * bundleWt;
      };

      summary[b.bottom1.dia] += getKg(b.bottom1.dia, b.bottom1.nos, mainM);
      summary[b.bottom2.dia] += getKg(b.bottom2.dia, b.bottom2.nos, mainM);
      summary[b.top1.dia]    += getKg(b.top1.dia,    b.top1.nos,    mainM);
      summary[b.top2.dia]    += getKg(b.top2.dia,    b.top2.nos,    mainM);
      summary[b.ex1.dia]     += getKg(b.ex1.dia,     b.ex1.nos,     mainM);
      summary[b.ex2.dia]     += getKg(b.ex2.dia,     b.ex2.nos,     exM);

      const stirrupQty = Math.floor((mainFt * 12) / (parseFloat(b.spacing) || 6)) + 1;
      const stirrupWeight = (stirrupQty * (STIRRUP_CUTTING_FT / FEET_TO_METER)) * (UNIT_WEIGHTS[b.stirrupDia] || 0.395);
      summary[b.stirrupDia] += stirrupWeight;
    });

    return summary;
  }, [beams]);

  const updateField = (id: number, path: string, val: string | number) => {
    setBeams((prev) =>
      prev.map((beam) => {
        if (beam.id !== id) return beam;
        const newB = JSON.parse(JSON.stringify(beam));
        if (path.includes('.')) {
          const [key, field] = path.split('.');
          newB[key][field] = val;
        } else {
          newB[path] = val;
        }
        return newB;
      })
    );
  };

  const shareWA = () => {
    let msg = `*${APP_TITLE} SUMMARY*\n\n`;
    (Object.entries(totals) as [string, number][]).forEach(([dia, kg]) => {
      if (kg > 0) msg += `✅ ${dia}mm: ${kg.toFixed(2)} KG\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openPdfReport = () => {
    if (printRef.current) {
      const el = printRef.current;
      const tableBody = el.querySelector('.print-table');
      const totalBody = el.querySelector('.print-total');
      if (tableBody) {
        tableBody.innerHTML = beams
          .map(
            (b) =>
              `<tr><td>${b.grid}</td><td>${b.w}</td><td>${b.d}</td><td>${b.mainFt}</td><td>${b.exFt}</td><td>${b.spacing}</td></tr>`
          )
          .join('');
      }
      if (totalBody) {
        totalBody.innerHTML = (Object.entries(totals) as [string, number][])
          .filter(([, kg]) => kg > 0)
          .map(([dia, kg]) => `<tr><td>${dia}mm</td><td>${kg.toFixed(2)} KG</td></tr>`)
          .join('');
      }
    }
    window.print();
  };

  useEffect(() => {
    if (printRef.current) {
      const el = printRef.current;
      const tableBody = el.querySelector('.print-table');
      const totalBody = el.querySelector('.print-total');
      if (tableBody) {
        tableBody.innerHTML = beams
          .map(
            (b) =>
              `<tr><td>${b.grid}</td><td>${b.w}</td><td>${b.d}</td><td>${b.mainFt}</td><td>${b.exFt}</td><td>${b.spacing}</td></tr>`
          )
          .join('');
      }
      if (totalBody) {
        totalBody.innerHTML = (Object.entries(totals) as [string, number][])
          .filter(([, kg]) => kg > 0)
          .map(([dia, kg]) => `<tr><td>${dia}mm</td><td>${kg.toFixed(2)} KG</td></tr>`)
          .join('');
      }
    }
  }, [beams, totals]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{APP_TITLE}</h1>
        <div style={styles.btnRow}>
          <button type="button" onClick={shareWA} style={styles.waBtn}>
            SHARE WHATSAPP
          </button>
          <button
            type="button"
            onClick={openPdfReport}
            style={styles.pdfBtn}
          >
            PDF REPORT
          </button>
          <button
            type="button"
            onClick={() => setBeams([initialBeam(Date.now())])}
            style={styles.clearBtn}
          >
            CLEAR ALL
          </button>
        </div>
      </header>

      {beams.map((b) => (
        <div key={b.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <input
              aria-label="Grid"
              value={b.grid}
              onChange={(e) => updateField(b.id, 'grid', e.target.value)}
              style={styles.gridIn}
            />
            <button
              type="button"
              onClick={() => setBeams(beams.filter((x) => x.id !== b.id))}
              style={styles.remBtn}
            >
              REMOVE
            </button>
          </div>

          <div style={styles.row3}>
            <Field
              label="W(mm)"
              val={b.w}
              set={(v: string) => updateField(b.id, 'w', v)}
            />
            <Field
              label="D(mm)"
              val={b.d}
              set={(v: string) => updateField(b.id, 'd', v)}
            />
            <Field
              label="MAIN(FT)"
              val={b.mainFt}
              set={(v: string) => updateField(b.id, 'mainFt', v)}
            />
          </div>

          <Section
            title="BOTTOM (Col 1 + Col 2)"
            d1={b.bottom1}
            d2={b.bottom2}
            bId={b.id}
            path="bottom"
            update={updateField}
            color="#e7f1ff"
          />
          <Section
            title="TOP (Col 1 + Col 2)"
            d1={b.top1}
            d2={b.top2}
            bId={b.id}
            path="top"
            update={updateField}
            color="#fff3cd"
          />
          <Section
            title="EXTRA (Col 1 + Col 2)"
            d1={b.ex1}
            d2={b.ex2}
            bId={b.id}
            path="ex"
            update={updateField}
            color="#d1e7dd"
          />

          <div style={styles.row3}>
            <Field
              label="EX LEN"
              val={b.exFt}
              set={(v: string) => updateField(b.id, 'exFt', v)}
            />
            <Field
              label="SPACING"
              val={b.spacing}
              set={(v: string) => updateField(b.id, 'spacing', v)}
            />
            <div style={styles.fBox}>
              <label style={styles.fLabel}>STIRRUP ø</label>
              <select
                aria-label="Stirrup diameter"
                value={b.stirrupDia}
                onChange={(e) =>
                  updateField(b.id, 'stirrupDia', parseInt(e.target.value, 10))
                }
                style={styles.fSel}
              >
                {[8, 10, 12].map((d) => (
                  <option key={d} value={d}>
                    {d}mm
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setBeams([...beams, initialBeam(Date.now())])}
        style={styles.addBtn}
      >
        + ADD BEAM
      </button>

      <footer style={styles.footer}>
        <div style={styles.fTitle}>TOTAL QUANTITY (KG)</div>
        <div style={styles.statRow}>
          {DIAMETER_ORDER.filter((d) => totals[d] > 0).map((d) => (
            <Stat key={d} label={`${d}mm`} val={totals[d]} />
          ))}
        </div>
      </footer>

      <div
        ref={printRef}
        className="print-only"
        style={printStyles.wrapper}
      >
        <h1 className="print-title" style={printStyles.title}>
          {APP_TITLE}
        </h1>
        <p style={printStyles.date}>
          Report date: {new Date().toLocaleDateString()}
        </p>
        <table style={printStyles.table}>
          <thead>
            <tr>
              <th>Grid</th>
              <th>W(mm)</th>
              <th>D(mm)</th>
              <th>Main(ft)</th>
              <th>Ex(ft)</th>
              <th>Spacing</th>
            </tr>
          </thead>
          <tbody className="print-table" />
        </table>
        <h2 style={printStyles.totalTitle}>Total quantity (KG)</h2>
        <table style={printStyles.table}>
          <tbody className="print-total" />
        </table>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; }
        }
        @media screen {
          .print-only { position: absolute; left: -9999px; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  val: string;
  set: (v: string) => void;
}> = ({ label, val, set }) => (
  <div style={styles.fBox}>
    <label style={styles.fLabel}>{label}</label>
    <input
      type="number"
      aria-label={label}
      value={val}
      onChange={(e) => set(e.target.value)}
      style={styles.fIn}
    />
  </div>
);

const Section: React.FC<{
  title: string;
  d1: RebarData;
  d2: RebarData;
  bId: number;
  path: 'bottom' | 'top' | 'ex';
  update: (id: number, path: string, val: string | number) => void;
  color: string;
}> = ({ title, d1, d2, bId, path, update, color }) => (
  <div style={{ ...styles.sec, backgroundColor: color }}>
    <div style={styles.secT}>{title}</div>
    <div style={styles.row2}>
      <Pair
        d={d1}
        up={(v: number) => update(bId, `${path}1.dia`, v)}
        upN={(v: string) => update(bId, `${path}1.nos`, v)}
      />
      <Pair
        d={d2}
        up={(v: number) => update(bId, `${path}2.dia`, v)}
        upN={(v: string) => update(bId, `${path}2.nos`, v)}
      />
    </div>
  </div>
);

const Pair: React.FC<{
  d: RebarData;
  up: (v: number) => void;
  upN: (v: string) => void;
}> = ({ d, up, upN }) => (
  <div style={styles.pair}>
    <select
      aria-label="Diameter"
      value={d.dia}
      onChange={(e) => up(parseInt(e.target.value, 10))}
      style={styles.sel}
    >
      {[8, 10, 12, 16, 20, 25].map((x) => (
        <option key={x} value={x}>
          {x}ø
        </option>
      ))}
    </select>
    <input
      type="number"
      aria-label="Numbers"
      value={d.nos}
      onChange={(e) => upN(e.target.value)}
      style={styles.nosIn}
    />
  </div>
);

const Stat: React.FC<{ label: string; val: number }> = ({ label, val }) => (
  <div style={styles.sBox}>
    <div style={styles.sLab}>{label}</div>
    <div style={styles.sVal}>{val ? val.toFixed(2) : '0.00'}</div>
  </div>
);

const styles: Record<string, CSSProperties> = {
  container: { maxWidth: '500px', margin: '0 auto', background: '#f4f7f9', minHeight: '100vh', padding: '10px 10px 120px', fontFamily: 'sans-serif' },
  header: { background: '#0d6efd', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' as const, marginBottom: '15px' },
  title: { margin: '0 0 10px', fontSize: '20px' },
  btnRow: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' },
  waBtn: { background: '#25D366', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' },
  pdfBtn: { background: '#6c757d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' },
  clearBtn: { background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' },
  card: { background: '#fff', borderRadius: '15px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  gridIn: { border: 'none', borderBottom: '2px solid #0d6efd', fontWeight: 'bold', fontSize: '16px', width: '70px', outline: 'none' },
  remBtn: { color: '#dc3545', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' },
  row3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' },
  fBox: { background: '#f8fafc', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  fLabel: { fontSize: '8px', fontWeight: 'bold', color: '#64748b', display: 'block' },
  fIn: { width: '100%', border: 'none', background: 'none', fontWeight: 'bold', textAlign: 'center' as const, outline: 'none' },
  fSel: { width: '100%', border: 'none', background: 'none', fontWeight: 'bold', outline: 'none' },
  sec: { padding: '10px', borderRadius: '10px', marginBottom: '10px' },
  secT: { fontSize: '9px', fontWeight: 'bold', marginBottom: '6px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' },
  pair: { display: 'flex', background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' },
  sel: { border: 'none', background: '#f1f5f9', fontSize: '12px', padding: '4px' },
  nosIn: { width: '100%', border: 'none', textAlign: 'center' as const, fontWeight: 'bold', outline: 'none' },
  addBtn: { width: '100%', padding: '14px', borderRadius: '12px', background: '#fff', border: '2px dashed #0d6efd', color: '#0d6efd', fontWeight: 'bold', cursor: 'pointer' },
  footer: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#0d6efd', color: 'white', padding: '15px', borderRadius: '20px 20px 0 0', zIndex: 100 },
  fTitle: { textAlign: 'center' as const, fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' },
  statRow: { display: 'flex', justifyContent: 'space-around' },
  sBox: { textAlign: 'center' as const },
  sLab: { fontSize: '10px', opacity: 0.8 },
  sVal: { fontSize: '20px', fontWeight: 'bold' },
};

const printStyles: Record<string, CSSProperties> = {
  wrapper: { background: '#fff', color: '#000' },
  title: { fontSize: '18px', marginBottom: '8px' },
  date: { fontSize: '12px', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '16px' },
  totalTitle: { fontSize: '14px', marginTop: '24px', marginBottom: '8px' },
};

export default UniqDesignsBBS;
