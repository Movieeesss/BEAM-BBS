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

interface BeamRow {
  id: number;
  tag: string;
  width: string;
  depth: string;
  mainLen: string;
  exLen: string;
  botDia: string; botNos: string;
  topDia: string; topNos: string;
  extDia: string; extNos: string;
  stirrupDia: string;
  stirrupSp: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', width: '230', depth: '380', mainLen: '60', exLen: '30',
      botDia: '16', botNos: '2', topDia: '12', topNos: '2', extDia: '16', extNos: '2',
      stirrupDia: '8', stirrupSp: '6'
    }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const mainL = parseFloat(r.mainLen) || 0;
      const exL = parseFloat(r.exLen) || 0;
      const w = parseFloat(r.width) || 0;
      const d = parseFloat(r.depth) || 0;
      const sp = parseFloat(r.stirrupSp) || 6;

      const calcWeight = (lenFt: number, nos: string, dia: string) => {
        const count = parseFloat(nos) || 0;
        const dNum = parseInt(dia);
        if (count === 0 || !STEEL_REF[dNum]) return 0;
        const totalM = (lenFt * count) / 3.281;
        const ref = STEEL_REF[dNum];
        // Rectified Math: (TotalM / RodLength / RodsPerBundle) * BundleWeight
        return (totalM / 12.19 / ref.rodsPerBundle) * ref.bundleWt;
      };

      const wBot = calcWeight(mainL, r.botNos, r.botDia);
      const wTop = calcWeight(mainL, r.topNos, r.topDia);
      const wExt = calcWeight(exL, r.extNos, r.extDia);

      // Stirrup Logic from Excel
      const sCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const sNos = Math.ceil((mainL * 12) / sp);
      const sTotalM = (sCutFt * sNos) / 3.281;
      const sRef = STEEL_REF[parseInt(r.stirrupDia)];
      const wStirrup = (sTotalM / 12.19 / sRef.rodsPerBundle) * sRef.bundleWt;

      return { ...r, wBot, wTop, wExt, wStirrup, total: wBot + wTop + wExt + wStirrup };
    });

    const summary: Record<string, number> = {};
    results.forEach(res => {
      [ 
        {d: res.botDia, w: res.wBot}, {d: res.topDia, w: res.wTop}, 
        {d: res.extDia, w: res.wExt}, {d: res.stirrupDia, w: res.wStirrup} 
      ].forEach(item => {
        if (item.w > 0) summary[item.d] = (summary[item.d] || 0) + item.w;
      });
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof BeamRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("BEAM BBS PROJECT REPORT", 105, 15, {align: 'center'});
    autoTable(doc, {
      startY: 25,
      head: [['Beam', 'Size', 'Bottom', 'Top', 'Extra', 'Stirrups', 'Weight']],
      body: computedData.results.map(r => [
        r.tag, `${r.width}x${r.depth}`, `${r.botNos}-${r.botDia}mm`, `${r.topNos}-${r.topDia}mm`, 
        `${r.extNos}-${r.extDia}mm`, `${r.stirrupDia}mm@${r.stirrupSp}"`, `${r.total.toFixed(2)}kg`
      ]),
      headStyles: { fillColor: [0, 112, 192] }
    });
    doc.save("Project_Report.pdf");
  };

  const shareToWhatsApp = () => {
    let msg = `*BEAM BBS REPORT*%0A`;
    computedData.results.forEach(r => msg += `*${r.tag}*: ${r.total.toFixed(2)} KG%0A`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', borderBottom: '4px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>BEAM BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '15px', marginBottom: '15px', overflow: 'hidden', border: '2px solid #0070c0' }}>
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <input value={row.tag} onChange={e => updateRow(row.id, 'tag', e.target.value)} style={tagInput} />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={remBtn}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={cell}><label style={lbl}>Width(mm)</label><input value={row.width} onChange={e=>updateRow(row.id,'width',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Depth(mm)</label><input value={row.depth} onChange={e=>updateRow(row.id,'depth',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Main(Ft)</label><input value={row.mainLen} onChange={e=>updateRow(row.id,'mainLen',e.target.value)} style={inpt}/></div>

                {/* Bottom Bars */}
                <div style={blueCell}><label style={lbl}>Bottom Dia/Nos</label>
                  <div style={{display:'flex'}}>
                    <select value={row.botDia} onChange={e=>updateRow(row.id,'botDia',e.target.value)} style={sel}>{Object.keys(STEEL_REF).map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <input value={row.botNos} onChange={e=>updateRow(row.id,'botNos',e.target.value)} style={inptS}/>
                  </div>
                </div>
                {/* Top Bars */}
                <div style={blueCell}><label style={lbl}>Top Dia/Nos</label>
                  <div style={{display:'flex'}}>
                    <select value={row.topDia} onChange={e=>updateRow(row.id,'topDia',e.target.value)} style={sel}>{Object.keys(STEEL_REF).map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <input value={row.topNos} onChange={e=>updateRow(row.id,'topNos',e.target.value)} style={inptS}/>
                  </div>
                </div>
                {/* Extra Bars */}
                <div style={blueCell}><label style={lbl}>Extra Dia/Nos</label>
                  <div style={{display:'flex'}}>
                    <select value={row.extDia} onChange={e=>updateRow(row.id,'extDia',e.target.value)} style={sel}>{Object.keys(STEEL_REF).map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <input value={row.extNos} onChange={e=>updateRow(row.id,'extNos',e.target.value)} style={inptS}/>
                  </div>
                </div>

                <div style={cell}><label style={lbl}>Ex Len(ft)</label><input value={row.exLen} onChange={e=>updateRow(row.id,'exLen',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Stirrup Dia/Sp</label>
                  <div style={{display:'flex'}}>
                    <select value={row.stirrupDia} onChange={e=>updateRow(row.id,'stirrupDia',e.target.value)} style={sel}>{Object.keys(STEEL_REF).map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <input value={row.stirrupSp} onChange={e=>updateRow(row.id,'stirrupSp',e.target.value)} style={inptS}/>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '2px solid #0070c0' }}>
                <span>{row.stirrupDia}mm @ {row.stirrupSp}" STIRRUPS</span>
                <span>{res.total.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={sumCard}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', color: '#0070c0', margin: '0 0 10px 0' }}>TOTAL BEAM STEEL</h2>
          {Object.entries(computedData.summary).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([dia, kg]) => (
            <div key={dia} style={sumRow}><span>{dia}mm Steel:</span><span>{kg.toFixed(2)} KG</span></div>
          ))}
        </div>

        <button onClick={() => setRows([...rows, { ...rows[0], id: Date.now(), tag: `B${rows.length + 1}` }])} style={btnBlue}>+ ADD NEW BEAM</button>
        <button onClick={generatePDF} style={btnBlack}>DOWNLOAD PROJECT REPORT</button>
        <button onClick={shareToWhatsApp} style={btnGreen}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}

// Styles
const cell: React.CSSProperties = { background: '#fff', padding: '6px', borderRadius: '8px' };
const blueCell: React.CSSProperties = { background: '#e1f5fe', padding: '6px', borderRadius: '8px' };
const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 'bold', color: '#666', display: 'block' };
const inpt: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: '900', width: '100%', outline: 'none' };
const inptS: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: '900', width: '50%', textAlign: 'right', outline: 'none', background: 'transparent' };
const sel: React.CSSProperties = { border: 'none', fontSize: '14px', fontWeight: 'bold', background: 'transparent', width: '50%' };
const tagInput: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', width: '100px', borderRadius: '4px', padding: '2px 5px' };
const remBtn: React.CSSProperties = { background: 'red', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
const sumCard: React.CSSProperties = { background: '#fff', border: '2px solid #0070c0', borderRadius: '15px', padding: '15px', marginBottom: '15px' };
const sumRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' };
const btnBlue: React.CSSProperties = { width: '100%', padding: '15px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' };
const btnBlack: React.CSSProperties = { width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' };
const btnGreen: React.CSSProperties = { width: '100%', padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
