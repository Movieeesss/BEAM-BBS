import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  stirrupDia: string;
  stirrupSp: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', width: '230', depth: '380', mainLen: '60', exLen: '30',
      bot16: '1', bot12: '1', top16: '1', top12: '1', ext16: '1', ext12: '1',
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

      const calcW = (lenFt: number, nos: string, dia: number) => {
        const count = parseFloat(nos) || 0;
        if (count === 0) return 0;
        const totalM = (lenFt * count) / 3.281;
        const ref = STEEL_REF[dia];
        // Math Rectification: Ensuring full bundle logic weight
        return (totalM / 12.19 / ref.rodsPerBundle) * ref.bundleWt;
      };

      const kg16 = calcW(mainL, r.bot16, 16) + calcW(mainL, r.top16, 16) + calcW(exL, r.ext16, 16);
      const kg12 = calcW(mainL, r.bot12, 12) + calcW(mainL, r.top12, 12) + calcW(exL, r.ext12, 12);

      const sCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const sNos = Math.ceil((mainL * 12) / sp);
      const sTotalM = (sCutFt * sNos) / 3.281;
      const sRef = STEEL_REF[parseInt(r.stirrupDia)];
      const kgS = (sTotalM / 12.19 / sRef.rodsPerBundle) * sRef.bundleWt;

      return { ...r, kg16, kg12, kgS, total: kg16 + kg12 + kgS };
    });

    const summary = { 8: 0, 10: 0, 12: 0, 16: 0 };
    results.forEach(res => {
      summary[parseInt(res.stirrupDia) as keyof typeof summary] += res.kgS;
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
    doc.text("BEAM BBS PROJECT REPORT", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Beam', '16mm KG', '12mm KG', 'Stirrups', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, r.kg16.toFixed(2), r.kg12.toFixed(2), r.kgS.toFixed(2), r.total.toFixed(2)
      ]),
      headStyles: { fillColor: [0, 112, 192] }
    });
    doc.save("Beam_Report.pdf");
  };

  const shareToWhatsApp = () => {
    let msg = `*BEAM BBS REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      msg += `*${r.tag}*: ${r.width}x${r.depth} | *${r.total.toFixed(2)} KG*%0A`;
    });
    msg += `%0A*TOTAL SUMMARY:*%0A16mm: ${computedData.summary[16].toFixed(2)} KG%0A12mm: ${computedData.summary[12].toFixed(2)} KG%0A8mm: ${computedData.summary[8].toFixed(2)} KG`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '30px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '18px', textAlign: 'center', borderBottom: '4px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>BEAM BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '15px', marginBottom: '15px', overflow: 'hidden', border: '2px solid #0070c0' }}>
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between' }}>
                <input value={row.tag} onChange={e => updateRow(row.id, 'tag', e.target.value)} style={tagStyle} />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={remBtn}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={cell}><label style={lbl}>Width(mm)</label><input value={row.width} onChange={e=>updateRow(row.id,'width',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Depth(mm)</label><input value={row.depth} onChange={e=>updateRow(row.id,'depth',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Main(Ft)</label><input value={row.mainLen} onChange={e=>updateRow(row.id,'mainLen',e.target.value)} style={inpt}/></div>

                <div style={blueCell}><label style={lbl}>Bot 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.bot16} onChange={e=>updateRow(row.id,'bot16',e.target.value)} style={inptS}/><input value={row.bot12} onChange={e=>updateRow(row.id,'bot12',e.target.value)} style={inptS}/></div>
                </div>
                <div style={blueCell}><label style={lbl}>Top 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.top16} onChange={e=>updateRow(row.id,'top16',e.target.value)} style={inptS}/><input value={row.top12} onChange={e=>updateRow(row.id,'top12',e.target.value)} style={inptS}/></div>
                </div>
                <div style={blueCell}><label style={lbl}>Ext 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.ext16} onChange={e=>updateRow(row.id,'ext16',e.target.value)} style={inptS}/><input value={row.ext12} onChange={e=>updateRow(row.id,'ext12',e.target.value)} style={inptS}/></div>
                </div>

                <div style={cell}><label style={lbl}>Ex Len(ft)</label><input value={row.exLen} onChange={e=>updateRow(row.id,'exLen',e.target.value)} style={inpt}/></div>
                <div style={cell}><label style={lbl}>Stirrup Dia/Sp</label>
                  <div style={{display:'flex'}}>
                    <select value={row.stirrupDia} onChange={e=>updateRow(row.id,'stirrupDia',e.target.value)} style={sel}>
                      {[8, 10].map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input value={row.stirrupSp} onChange={e=>updateRow(row.id,'stirrupSp',e.target.value)} style={inptS}/>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '2px solid #0070c0' }}>
                <span>STIRRUPS: {row.stirrupDia}mm @ {row.stirrupSp}"</span>
                <span>{res.total.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={sumCard}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', color: '#0070c0', margin: '0 0 15px 0' }}>TOTAL BEAM STEEL</h2>
          <div style={sumRow}><span>16mm Steel:</span><span>{computedData.summary[16].toFixed(2)} KG</span></div>
          <div style={sumRow}><span>12mm Steel:</span><span>{computedData.summary[12].toFixed(2)} KG</span></div>
          <div style={sumRow}><span>8mm Steel:</span><span>{computedData.summary[8].toFixed(2)} KG</span></div>
        </div>

        <button onClick={() => setRows([...rows, { ...rows[0], id: Date.now(), tag: `B${rows.length + 1}` }])} style={btnBlue}>+ ADD NEW BEAM</button>
        <button onClick={generatePDF} style={btnBlack}>DOWNLOAD PROJECT PDF</button>
        <button onClick={shareToWhatsApp} style={btnGreen}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}

const cell = { background: '#fff', padding: '6px', borderRadius: '10px' };
const blueCell = { background: '#e1f5fe', padding: '6px', borderRadius: '10px' };
const lbl = { fontSize: '10px', fontWeight: 'bold', color: '#666', display: 'block' };
const inpt = { border: 'none', fontSize: '16px', fontWeight: '900', width: '100%', outline: 'none' };
const inptS = { border: 'none', fontSize: '16px', fontWeight: '900', width: '50%', textAlign: 'center', background: 'transparent' };
const tagStyle = { background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', width: '80px', borderRadius: '4px', padding: '2px 5px' };
const remBtn = { background: 'red', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' };
const sumCard = { background: '#fff', border: '2px solid #0070c0', borderRadius: '15px', padding: '15px', marginBottom: '15px' };
const sumRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' };
const btnBlue = { width: '100%', padding: '15px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginBottom: '10px' };
const btnBlack = { width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginBottom: '10px' };
const btnGreen = { width: '100%', padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' };
