import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Commercial Reference Data from Image 50
const STEEL_REF: Record<number, { rodsPerBundle: number; bundleWt: number }> = {
  8:  { rodsPerBundle: 10, bundleWt: 47.4 },
  10: { rodsPerBundle: 7,  bundleWt: 51.87 },
  12: { rodsPerBundle: 5,  bundleWt: 53.35 },
  16: { rodsPerBundle: 3,  bundleWt: 56.88 },
  20: { rodsPerBundle: 2,  bundleWt: 59.26 },
  25: { rodsPerBundle: 1,  bundleWt: 46.3 },
};

const DIAMETERS = [8, 10, 12, 16, 20, 25];

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
  stirrupDia: string;
  stirrupSp: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', width: '230', depth: '380', mainLen: '60', exLen: '30',
      bot16: '2', bot12: '1', top16: '2', top12: '1', ext16: '2', ext12: '1',
      stirrupDia: '8', stirrupSp: '6'
    }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const mL = parseFloat(r.mainLen) || 0;
      const xL = parseFloat(r.exLen) || 0;
      const w = parseFloat(r.width) || 0;
      const d = parseFloat(r.depth) || 0;
      const sp = parseFloat(r.stirrupSp) || 6;

      // Logic: (Length * Nos) / 3.281 to get Meters
      const m16 = ((mL * (parseFloat(r.bot16)||0)) + (mL * (parseFloat(r.top16)||0)) + (xL * (parseFloat(r.ext16)||0))) / 3.281;
      const m12 = ((mL * (parseFloat(r.bot12)||0)) + (mL * (parseFloat(r.top12)||0)) + (xL * (parseFloat(r.ext12)||0))) / 3.281;

      // Weight Conversion: (Total Meters / 12.19 / rodsPerBundle) * bundleWt
      const kg16 = (m16 / 12.19 / STEEL_REF[16].rodsPerBundle) * STEEL_REF[16].bundleWt;
      const kg12 = (m12 / 12.19 / STEEL_REF[12].rodsPerBundle) * STEEL_REF[12].bundleWt;

      // Stirrup Logic: (2*((W/25.4)+(D/25.4))-6)/12 for Feet
      const sCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const sNos = Math.ceil((mL * 12) / sp);
      const sTotalM = (sCutFt * sNos) / 3.281;
      const sDia = parseInt(r.stirrupDia);
      const kgS = (sTotalM / 12.19 / STEEL_REF[sDia].rodsPerBundle) * STEEL_REF[sDia].bundleWt;

      return { ...r, kg16, kg12, kgS, rowTotal: kg16 + kg12 + kgS };
    });

    const summary = { 8: 0, 10: 0, 12: 0, 16: 0 };
    results.forEach(res => {
      summary[16] += res.kg16;
      summary[12] += res.kg12;
      const sD = parseInt(res.stirrupDia) as keyof typeof summary;
      if (summary[sD] !== undefined) summary[sD] += res.kgS;
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof BeamRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("BEAM BBS PROJECT REPORT", 105, 15, { align: 'center' });
    autoTable(doc, {
      startY: 25,
      head: [['Beam', '16mm KG', '12mm KG', 'Stirrups', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, r.kg16.toFixed(2), r.kg12.toFixed(2), r.kgS.toFixed(2), r.rowTotal.toFixed(2)
      ]),
      headStyles: { fillColor: [0, 112, 192] }
    });
    doc.save("Project_Report.pdf");
  };

  // UI Styles for exact Design Match
  const card: React.CSSProperties = { background: '#fff', borderRadius: '20px', padding: '15px', marginBottom: '15px', border: '1px solid #e0e0e0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
  const blueBox: React.CSSProperties = { background: '#e1f5fe', padding: '8px', borderRadius: '12px', textAlign: 'center' };
  const label: React.CSSProperties = { fontSize: '10px', fontWeight: 'bold', color: '#0070c0', display: 'block', marginBottom: '2px' };
  const input: React.CSSProperties = { border: 'none', background: 'transparent', width: '100%', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', outline: 'none' };
  const rodRow: React.CSSProperties = { display: 'flex', gap: '5px', background: '#e1f5fe', padding: '5px', borderRadius: '8px', marginBottom: '4px', alignItems: 'center' };
  const rodLabel: React.CSSProperties = { width: '30px', fontSize: '12px', fontWeight: 'bold' };
  const rodInput: React.CSSProperties = { width: '100%', border: 'none', background: '#4db8ff', color: 'white', borderRadius: '5px', textAlign: 'center', fontWeight: 'bold', padding: '4px' };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '12px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', borderRadius: '10px', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>BEAM BBS CALCULATOR</h1>
      </header>

      {rows.map((row, idx) => (
        <div key={row.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0070c0' }}>{row.tag}</span>
            <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold' }}>REMOVE</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div style={blueBox}><label style={label}>Width(mm)</label><input value={row.width} onChange={e=>updateRow(row.id,'width',e.target.value)} style={input}/></div>
            <div style={blueBox}><label style={label}>Depth(mm)</label><input value={row.depth} onChange={e=>updateRow(row.id,'depth',e.target.value)} style={input}/></div>
            <div style={blueBox}><label style={label}>Main(ft)</label><input value={row.mainLen} onChange={e=>updateRow(row.id,'mainLen',e.target.value)} style={input}/></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ margin: '0 0 5px', fontWeight: 'bold', fontSize: '11px' }}>Bottom</p>
              <div style={rodRow}><span style={rodLabel}>16</span><input value={row.bot16} onChange={e=>updateRow(row.id,'bot16',e.target.value)} style={rodInput}/></div>
              <div style={rodRow}><span style={rodLabel}>12</span><input value={row.bot12} onChange={e=>updateRow(row.id,'bot12',e.target.value)} style={rodInput}/></div>
              <p style={{ margin: '8px 0 5px', fontWeight: 'bold', fontSize: '11px' }}>Extra</p>
              <div style={rodRow}><span style={rodLabel}>16</span><input value={row.ext16} onChange={e=>updateRow(row.id,'ext16',e.target.value)} style={rodInput}/></div>
              <div style={rodRow}><span style={rodLabel}>12</span><input value={row.ext12} onChange={e=>updateRow(row.id,'ext12',e.target.value)} style={rodInput}/></div>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontWeight: 'bold', fontSize: '11px' }}>Top</p>
              <div style={rodRow}><span style={rodLabel}>16</span><input value={row.top16} onChange={e=>updateRow(row.id,'top16',e.target.value)} style={rodInput}/></div>
              <div style={rodRow}><span style={rodLabel}>12</span><input value={row.top12} onChange={e=>updateRow(row.id,'top12',e.target.value)} style={rodInput}/></div>
              <div style={{...blueBox, marginTop:'10px'}}><label style={label}>Ex Len(ft)</label><input value={row.exLen} onChange={e=>updateRow(row.id,'exLen',e.target.value)} style={input}/></div>
              <div style={{...blueBox, marginTop:'8px'}}><label style={label}>Spacing(in)</label><input value={row.stirrupSp} onChange={e=>updateRow(row.id,'stirrupSp',e.target.value)} style={input}/></div>
              <div style={{...blueBox, marginTop:'8px'}}><label style={label}>Stirrup Dia</label>
                <select value={row.stirrupDia} onChange={e=>updateRow(row.id,'stirrupDia',e.target.value)} style={{border:'none', width:'100%', fontWeight:'bold', background:'transparent'}}>
                  <option value="8">8mm</option><option value="10">10mm</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffff00', padding: '10px', marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderRadius: '8px', border: '1px solid #0070c0' }}>
            <span>STIRRUPS: {row.stirrupDia}mm @ {row.stirrupSp}"</span>
            <span>{computedData.results[idx].rowTotal.toFixed(2)} KG</span>
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
      <button onClick={() => {
        let msg = `*BEAM BBS REPORT*%0ATotal: ${Object.values(computedData.summary).reduce((a,b)=>a+b,0).toFixed(2)} KG`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
      }} style={btnGreen}>SHARE TO WHATSAPP</button>
    </div>
  );
}

const sumRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' as const };
const btnBlue = { width: '100%', padding: '15px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, marginBottom: '10px', cursor: 'pointer' };
const btnBlack = { width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, marginBottom: '10px', cursor: 'pointer' };
const btnGreen = { width: '100%', padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer' };
