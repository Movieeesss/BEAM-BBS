import React, { useState, useMemo, useRef, useEffect, CSSProperties } from 'react';

/**
 * BEAM BBS
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
  16: 56.88,
  12: 53.35,
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
const STIRRUP_CUTTING_FT = 3.5; // Excel: 8mm stirrups Cutting Length in Ft.

const APP_TITLE = 'UNIQ DESIGNS RENAMED OF BEAM BBS';

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

  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach((b) => {
      const mainFt = parseFloat(b.mainFt) || 0;
      const exFt = parseFloat(b.exFt) || 0;
      const mainM = mainFt / FEET_TO_METER;
      const exM = exFt / FEET_TO_METER;
      const L_Full = mainM + exM;

      const n = (key: keyof Beam, col: '1' | '2') => {
        const data = b[key] as RebarData;
        return parseFloat(data?.nos as string) || 0;
      };

      const bundleKg = (dia: number, bundles: number): number => {
        const bw = BUNDLE_WEIGHT_KG[dia];
        if (bw !== undefined) return bundles * bw;
        return bundles * L_Full * (UNIT_WEIGHTS[dia] ?? 0);
      };

      const ratio = mainFt > 0 ? exFt / mainFt : 0;
      const nosBottom1 = n('bottom1', '1');
      const nosBottom2 = n('bottom2', '2');
      const nosTop1 = n('top1', '1');
      const nosTop2 = n('top2', '2');
      const ex1Bundles = n('ex1', '1') * ratio;
      const ex2Bundles = n('ex2', '2') * ratio * 0.6;
      const bundles12 = (nos: number) => nos * 0.6;

      summary[b.bottom1.dia] += bundleKg(b.bottom1.dia, nosBottom1);
      summary[b.bottom2.dia] += bundleKg(b.bottom2.dia, bundles12(nosBottom2));
      summary[b.top1.dia] += bundleKg(b.top1.dia, nosTop1);
      summary[b.top2.dia] += bundleKg(b.top2.dia, bundles12(nosTop2));
      summary[b.ex1.dia] += bundleKg(b.ex1.dia, ex1Bundles);
      summary[b.ex2.dia] += bundleKg(b.ex2.dia, ex2Bundles);

      const stirrupQty =
        Math.floor((mainFt * 12) / (parseFloat(b.spacing) || 6)) + 1;
      const stirrupLenM = STIRRUP_CUTTING_FT / FEET_TO_METER;
      summary[b.stirrupDia] +=
        stirrupQty * stirrupLenM * (UNIT_WEIGHTS[b.stirrupDia] ?? 0.395);
    });

    return summary;
  }, [beams]);

  const updateField = (id: number, path: string, val: string | number) => {
    setBeams((prev) =>
      prev.map((beam) => {
        if (beam.id !== id) return beam;
        if (path.includes('.')) {
          const [key, field] = path.split('.');
          const subKey = key as 'bottom1' | 'bottom2' | 'top1' | 'top2' | 'ex1' | 'ex2';
          const sub = { ...beam[subKey] };
          if (field === 'dia') sub.dia = val as number;
          else sub.nos = String(val);
          return { ...beam, [subKey]: sub };
        }
        return { ...beam, [path]: val };
      })
    );
  };

  const shareWA = () => {
    let msg = `*${APP_TITLE}*\n\n`;
    (Object.entries(totals) as [string, number][]).forEach(([dia, kg]) => {
      if (kg > 0) msg += `${dia}mm: ${kg.toFixed(2)} KG\n`;
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
          <Stat label="8mm" val={totals[8]} />
          <Stat label="12mm" val={totals[12]} />
          <Stat label="16mm" val={totals[16]} />
        </div>
      </footer>

      {/* Printable report for PDF (Save as PDF in print dialog) */}
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
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    background: '#f4f7f9',
    minHeight: '100vh',
    padding: '10px 10px 120px',
    fontFamily: 'sans-serif',
  },
  header: {
    background: '#0d6efd',
    color: 'white',
    padding: '15px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '15px',
  },
  title: { margin: '0 0 10px', fontSize: '20px' },
  btnRow: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' },
  waBtn: {
    background: '#25D366',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '10px',
    cursor: 'pointer',
  },
  pdfBtn: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '10px',
    cursor: 'pointer',
  },
  clearBtn: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '10px',
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    borderRadius: '15px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  gridIn: {
    border: 'none',
    borderBottom: '2px solid #0d6efd',
    fontWeight: 'bold',
    fontSize: '16px',
    width: '70px',
    outline: 'none',
  },
  remBtn: {
    color: '#dc3545',
    border: 'none',
    background: 'none',
    fontWeight: 'bold',
    fontSize: '10px',
    cursor: 'pointer',
  },
  row3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  fBox: {
    background: '#f8fafc',
    padding: '6px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  fLabel: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#64748b',
    display: 'block',
  },
  fIn: {
    width: '100%',
    border: 'none',
    background: 'none',
    fontWeight: 'bold',
    textAlign: 'center',
    outline: 'none',
  },
  fSel: {
    width: '100%',
    border: 'none',
    background: 'none',
    fontWeight: 'bold',
    outline: 'none',
  },
  sec: {
    padding: '10px',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  secT: { fontSize: '9px', fontWeight: 'bold', marginBottom: '6px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' },
  pair: {
    display: 'flex',
    background: '#fff',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    overflow: 'hidden',
  },
  sel: {
    border: 'none',
    background: '#f1f5f9',
    fontSize: '12px',
    padding: '4px',
  },
  nosIn: {
    width: '100%',
    border: 'none',
    textAlign: 'center',
    fontWeight: 'bold',
    outline: 'none',
  },
  addBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#fff',
    border: '2px dashed #0d6efd',
    color: '#0d6efd',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#0d6efd',
    color: 'white',
    padding: '15px',
    borderRadius: '20px 20px 0 0',
    zIndex: 100,
  },
  fTitle: { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' },
  statRow: { display: 'flex', justifyContent: 'space-around' },
  sBox: { textAlign: 'center' },
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
