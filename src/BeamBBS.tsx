import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Commercial Reference Data from your Excel
const STEEL_REF: Record<number, { rodsPerBundle: number; bundleWt: number }> = {
  8:  { rodsPerBundle: 10, bundleWt: 47.4 },
  10: { rodsPerBundle: 7,  bundleWt: 51.87 },
  12: { rodsPerBundle: 5,  bundleWt: 53.35 },
  16: { rodsPerBundle: 3,  bundleWt: 56.88 },
  20: { rodsPerBundle: 2,  bundleWt: 59.26 },
  25: { rodsPerBundle: 1,  bundleWt: 46.3 },
};

interface BeamRow {
  id: number;
  tag: string;
  width: string;
  depth: string;
  mainLen: string;
  exLen: string;
  bot16: string; bot12: string;
  top16: string; top12: string;
  ext16: string; ext12: string;
  stirrupSp: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', width: '230', depth: '380', mainLen: '60', exLen: '30',
      bot16: '1', bot12: '1', top16: '1', top12: '1', ext16: '1', ext12: '1',
      stirrupSp: '6'
    }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const mainL = parseFloat(r.mainLen) || 0;
      const exL = parseFloat(r.exLen) || 0;
      const w = parseFloat(r.width) || 0;
      const d = parseFloat(r.depth) || 0;
      const sp = parseFloat(r.stirrupSp) || 6;

      const getKg = (len: number, nos: string, dia: number) => {
        const n = parseFloat(nos) || 0;
        if (n === 0) return 0;
        const totalM = (len * n) / 3.281;
        const ref = STEEL_REF[dia];
        return (totalM / 12.19 / ref.rodsPerBundle) * ref.bundleWt;
      };

      const kg16 = getKg(mainL, r.bot16, 16) + getKg(mainL, r.top16, 16) + getKg(exL, r.ext16, 16);
      const kg12 = getKg(mainL, r.bot12, 12) + getKg(mainL, r.top12, 12) + getKg(exL, r.ext12, 12);

      const sCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const sNos = Math.ceil((mainL * 12) / sp);
      const kg8 = ((sCutFt * sNos / 3.281) / 12.19 / STEEL_REF[8].rodsPerBundle) * STEEL_REF[8].bundleWt;

      return { ...r, kg16, kg12, kg8, total: kg16 + kg12 + kg8 };
    });

    const summary = { 8: 0, 12: 0, 16: 0 };
    results.forEach(res => {
      summary[8] += res.kg8;
      summary[12] += res.kg12;
      summary[16] += res.kg16;
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof BeamRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("BEAM STEEL PROJECT REPORT", 105, 15, { align: 'center' });
    autoTable(doc, {
      startY: 25,
      head: [['Beam', '16mm KG', '12mm KG', '8mm KG', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, r.kg16.toFixed(2), r.kg12.toFixed(2), r.kg8.toFixed(2), r.total.toFixed(2)
      ]),
      headStyles: { fillColor: [0, 112, 192] }
    });
    doc.save("Project_Report.pdf");
  };

  const shareWA = () => {
    const msg = `*BEAM BBS REPORT*%0ATotal: ${Object.values(computedData.summary).reduce((a,b)=>a+b,0).toFixed(2)} KG`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Error-Free Styles
  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: '20px', padding: '20px', marginBottom: '20px', border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', color: '#0070c0', display: 'block', marginBottom: '5px', textAlign: 'center' as const };
  const blueBoxStyle: React.CSSProperties = { background: '#e1f5fe', padding: '10px', borderRadius: '12px', textAlign: 'center' as const };
  const inputStyle: React.CSSProperties = { border: 'none', background: 'transparent', width: '100%', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' as const, outline: 'none' };
  const dualRow: React.CSSProperties = { display: 'flex', gap: '5px', background: '#e1f5fe', padding: '5px 10px', borderRadius: '8px', alignItems: 'center', marginBottom: '5px' };
  const rodLabel: React.CSSProperties = { width: '40px', fontSize: '14px', fontWeight: 'bold', color: '#444' };
  const rodInput: React.CSSProperties = { width: '100%', border: 'none', background: '#4db8ff', color: 'white', borderRadius: '5px', textAlign: 'center' as const, fontSize: '16px', padding: '4px', fontWeight: 'bold', outline: 'none' };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '10px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', borderRadius: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>BEAM BBS CALCULATOR</h1>
      </header>

      {rows.map((row) => (
        <div key={row.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0070c0' }}>{row.tag}</span>
            <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>REMOVE</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={blueBoxStyle}><label style={labelStyle}>Width(mm)</label><input value={row.width} onChange={e=>updateRow(row.id,'width',e.target.value)} style={inputStyle}/></div>
            <div style={blueBoxStyle}><label style={labelStyle}>Depth(mm)</label><input value={row.depth} onChange={e=>updateRow(row.id,'depth',e.target.value)} style={inputStyle}/></div>
            <div style={blueBoxStyle}><label style={labelStyle}>Main(ft)</label><input value={row.mainLen} onChange={e=>updateRow(row.id,'mainLen',e.target.value)} style={inputStyle}/></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <p style={{ margin: '0 0 5px 5px', fontWeight: 'bold', fontSize: '12px' }}>Bottom</p>
              <div style={dualRow}><span style={rodLabel}>16</span><input value={row.bot16} onChange={e=>updateRow(row.id,'bot16',e.target.value)} style={rodInput}/></div>
              <div style={dualRow}><span style={rodLabel}>12</span><input value={row.bot12} onChange={e=>updateRow(row.id,'bot12',e.target.value)} style={rodInput}/></div>
              
              <p style={{ margin: '10px 0 5px 5px', fontWeight: 'bold', fontSize: '12px' }}>Extra</p>
              <div style={dualRow}><span style={rodLabel}>16</span><input value={row.ext16} onChange={e=>updateRow(row.id,'ext16',e.target.value)} style={rodInput}/></div>
              <div style={dualRow}><span style={rodLabel}>12</span><input value={row.ext12} onChange={e=>updateRow(row.id,'ext12',e.target.value)} style={rodInput}/></div>
            </div>

            <div>
              <p style={{ margin: '0 0 5px 5px', fontWeight: 'bold', fontSize: '12px' }}>Top</p>
              <div style={dualRow}><span style={rodLabel}>16</span><input value={row.top16} onChange={e=>updateRow(row.id,'top16',e.target.value)} style={rodInput}/></div>
              <div style={dualRow}><span style={rodLabel}>12</span><input value={row.top12} onChange={e=>updateRow(row.id,'top12',e.target.value)} style={rodInput}/></div>

              <div style={{...blueBoxStyle, marginTop: '10px'}}><label style={labelStyle}>Ex Len(ft)</label><input value={row.exLen} onChange={e=>updateRow(row.id,'exLen',e.target.value)} style={inputStyle}/></div>
              <div style={{...blueBoxStyle, marginTop: '10px'}}><label style={labelStyle}>Spacing(in)</label><input value={row.stirrupSp} onChange={e=>updateRow(row.id,'stirrupSp',e.target.value)} style={inputStyle}/></div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ background: '#fff', border: '2px solid #0070c0', borderRadius: '15px', padding: '15px', marginBottom: '15px' }}>
        <h2 style={{ fontSize: '18px', textAlign: 'center', color: '#0070c0', margin: '0 0 10px 0' }}>TOTAL BEAM STEEL</h2>
        <div style={sumRow}><span>16mm Steel:</span><span>{computedData.summary[16].toFixed(2)} KG</span></div>
        <div style={sumRow}><span>12mm Steel:</span><span>{computedData.summary[12].toFixed(2)} KG</span></div>
        <div style={sumRow}><span>8mm Steel:</span><span>{computedData.summary[8].toFixed(2)} KG</span></div>
      </div>

      <button onClick={() => setRows([...rows, { ...rows[0], id: Date.now(), tag: `B${rows.length + 1}` }])} style={btnBlue}>+ ADD NEW BEAM</button>
      <button onClick={generatePDF} style={btnBlack}>DOWNLOAD PROJECT PDF</button>
      <button onClick={shareWA} style={btnGreen}>SHARE TO WHATSAPP</button>
    </div>
  );
}

const sumRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' as const };
const btnBlue = { width: '100%', padding: '15px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, marginBottom: '10px', cursor: 'pointer' };
const btnBlack = { width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, marginBottom: '10px', cursor: 'pointer' };
const btnGreen = { width: '100%', padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer' };
