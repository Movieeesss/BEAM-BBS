import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reference Data from Image 50
const STEEL_REF: Record<number, { unitWt: number; rodsPerBundle: number; bundleWt: number }> = {
  8:  { unitWt: 0.400, rodsPerBundle: 10, bundleWt: 47.4 },
  10: { unitWt: 0.618, rodsPerBundle: 7,  bundleWt: 51.87 },
  12: { unitWt: 0.890, rodsPerBundle: 5,  bundleWt: 53.35 },
  16: { unitWt: 1.590, rodsPerBundle: 3,  bundleWt: 56.88 },
  20: { unitWt: 2.470, rodsPerBundle: 2,  bundleWt: 59.26 },
  25: { unitWt: 3.860, rodsPerBundle: 1,  bundleWt: 46.3 },
};

interface BeamRow {
  id: number;
  tag: string;
  widthMm: string;
  depthMm: string;
  mainLenFt: string;
  extraLenFt: string;
  bot16: string; bot12: string;
  top16: string; top12: string;
  ext16: string; ext12: string;
  stirrupDia: string;
  stirrupSpInch: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', widthMm: '230', depthMm: '380', mainLenFt: '60', extraLenFt: '30',
      bot16: '1', bot12: '1', top16: '1', top12: '1', ext16: '1', ext12: '1',
      stirrupDia: '8', stirrupSpInch: '6'
    }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const mainL = parseFloat(r.mainLenFt) || 0;
      const extraL = parseFloat(r.extraLenFt) || 0;
      const w = parseFloat(r.widthMm) || 0;
      const d = parseFloat(r.depthMm) || 0;

      // 1. Main Rod Weights (Bundle Logic from your Excel)
      const calcKg = (lenFt: number, nos: string, dia: number) => {
        const count = parseFloat(nos) || 0;
        if (count === 0) return 0;
        const totalM = (lenFt * count) / 3.281;
        const ref = STEEL_REF[dia];
        const bundles = totalM / 12.19 / ref.rodsPerBundle;
        return bundles * ref.bundleWt;
      };

      const kg16 = calcKg(mainL, r.bot16, 16) + calcKg(mainL, r.top16, 16) + calcKg(extraL, r.ext16, 16);
      const kg12 = calcKg(mainL, r.bot12, 12) + calcKg(mainL, r.top12, 12) + calcKg(extraL, r.ext12, 12);

      // 2. Stirrup Logic (Image 40/43 formula)
      const stirrupCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const stirrupNos = Math.ceil((mainL * 12) / (parseFloat(r.stirrupSpInch) || 6));
      const stirrupTotalM = (stirrupCutFt * stirrupNos) / 3.281;
      const sRef = STEEL_REF[parseInt(r.stirrupDia)];
      const stirrupKg = (stirrupTotalM / 12.19 / sRef.rodsPerBundle) * sRef.bundleWt;

      return { ...r, kg16, kg12, stirrupKg, totalKg: kg16 + kg12 + stirrupKg };
    });

    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    results.forEach(res => {
      summary[16] += res.kg16;
      summary[12] += res.kg12;
      summary[parseInt(res.stirrupDia)] += res.stirrupKg;
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof BeamRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const shareToWhatsApp = () => {
    let msg = `*BEAM BBS FINAL REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      msg += `*${r.tag}* (${r.widthMm}x${r.depthMm})%0AWeight: *${r.totalKg.toFixed(2)} KG*%0A%0A`;
    });
    msg += `*FINAL SUMMARY*%0A`;
    Object.entries(computedData.summary).forEach(([dia, kg]) => {
      if (kg > 0) msg += `${dia}mm: ${kg.toFixed(2)} KG%0A`;
    });
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '20px', textAlign: 'center', borderBottom: '5px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>BEAM BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '15px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '12px', border: '2px solid #0070c0', marginBottom: '15px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <input value={row.tag} onChange={e => updateRow(row.id, 'tag', e.target.value)} style={tagInput} />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={remBtn}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={box}><label style={lbl}>Width(mm)</label><input type="number" value={row.widthMm} onChange={e => updateRow(row.id, 'widthMm', e.target.value)} style={inpt} /></div>
                <div style={box}><label style={lbl}>Depth(mm)</label><input type="number" value={row.depthMm} onChange={e => updateRow(row.id, 'depthMm', e.target.value)} style={inpt} /></div>
                <div style={box}><label style={lbl}>Main(Ft)</label><input type="number" value={row.mainLenFt} onChange={e => updateRow(row.id, 'mainLenFt', e.target.value)} style={inpt} /></div>
                
                <div style={blueBox}><label style={lbl}>Bot 16/12</label><div style={{display:'flex'}}><input value={row.bot16} onChange={e=>updateRow(row.id,'bot16',e.target.value)} style={inptS}/><input value={row.bot12} onChange={e=>updateRow(row.id,'bot12',e.target.value)} style={inptS}/></div></div>
                <div style={blueBox}><label style={lbl}>Top 16/12</label><div style={{display:'flex'}}><input value={row.top16} onChange={e=>updateRow(row.id,'top16',e.target.value)} style={inptS}/><input value={row.top12} onChange={e=>updateRow(row.id,'top12',e.target.value)} style={inptS}/></div></div>
                <div style={blueBox}><label style={lbl}>Ext 16/12</label><div style={{display:'flex'}}><input value={row.ext16} onChange={e=>updateRow(row.id,'ext16',e.target.value)} style={inptS}/><input value={row.ext12} onChange={e=>updateRow(row.id,'ext12',e.target.value)} style={inptS}/></div></div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                <span>STIRRUPS: {row.stirrupDia}mm @ {row.stirrupSpInch}"</span>
                <span>{res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={summaryCard}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', color: '#0070c0' }}>TOTAL BEAM STEEL</h2>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={sumRow}>
              <span>{dia}mm Steel:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
        </div>

        <button onClick={() => setRows([...rows, { id: Date.now(), tag: `B${rows.length + 1}`, widthMm: '230', depthMm: '380', mainLenFt: '10', extraLenFt: '5', bot16: '2', bot12: '0', top16: '2', top12: '0', ext16: '0', ext12: '0', stirrupDia: '8', stirrupSpInch: '6' }])} style={btnBlue}>+ ADD NEW BEAM</button>
        <button onClick={shareToWhatsApp} style={btnGreen}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}

// Styles
const box: React.CSSProperties = { background: '#fff', padding: '5px', borderRadius: '6px' };
const blueBox: React.CSSProperties = { background: '#e1f5fe', padding: '5px', borderRadius: '6px' };
const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 'bold', color: '#666' };
const inpt: React.CSSProperties = { border: 'none', fontSize: '15px', fontWeight: '900', width: '100%', outline: 'none' };
const inptS: React.CSSProperties = { border: 'none', fontSize: '15px', fontWeight: '900', width: '50%', textAlign: 'center', background: 'transparent' };
const tagInput: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', width: '100px', borderRadius: '4px' };
const remBtn: React.CSSProperties = { background: 'red', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '10px' };
const btnBlue: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px' };
const btnGreen: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' };
const summaryCard: React.CSSProperties = { background: '#fff', border: '2px solid #0070c0', borderRadius: '12px', padding: '15px', marginBottom: '20px' };
const sumRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' };
