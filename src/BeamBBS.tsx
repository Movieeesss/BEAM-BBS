import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Commercial Reference Data from your Excel Image 50
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
  bot16: string; bot12: string; // Dual Column Bottom
  top16: string; top12: string; // Dual Column Top
  ext16: string; ext12: string; // Dual Column Extra
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
        // Exact commercial formula: (Total Meters / Rod length 12.19 / rods per bundle) * bundle weight
        return (totalM / 12.19 / ref.rodsPerBundle) * ref.bundleWt;
      };

      // Accurate Summing for 16mm across all sections
      const kg16 = getKg(mainL, r.bot16, 16) + getKg(mainL, r.top16, 16) + getKg(exL, r.ext16, 16);
      
      // Accurate Summing for 12mm across all sections
      const kg12 = getKg(mainL, r.bot12, 12) + getKg(mainL, r.top12, 12) + getKg(exL, r.ext12, 12);

      // Stirrup Logic
      const sCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const sNos = Math.ceil((mainL * 12) / sp);
      const sTotalM = (sCutFt * sNos) / 3.281;
      const sRef = STEEL_REF[parseInt(r.stirrupDia)];
      const kgS = (sTotalM / 12.19 / sRef.rodsPerBundle) * sRef.bundleWt;

      return { ...r, kg16, kg12, kgS, total: kg16 + kg12 + kgS };
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
    doc.text("BEAM BBS DUAL COLUMN REPORT", 105, 15, { align: 'center' });
    autoTable(doc, {
      startY: 25,
      head: [['Beam', '16mm KG', '12mm KG', 'Stirrups', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, r.kg16.toFixed(2), r.kg12.toFixed(2), r.kgS.toFixed(2), r.total.toFixed(2)
      ]),
      headStyles: { fillColor: [0, 112, 192] }
    });
    doc.save("Beam_BBS_Report.pdf");
  };

  const shareWhatsApp = () => {
    let msg = `*BEAM BBS REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      msg += `*${r.tag}*: 16mm(${r.kg16.toFixed(1)}kg) 12mm(${r.kg12.toFixed(1)}kg) | *Total: ${r.total.toFixed(2)}kg*%0A`;
    });
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Explicit TypeScript CSS Properties
  const card: React.CSSProperties = { background: '#00b0f0', borderRadius: '15px', marginBottom: '15px', border: '2px solid #0070c0', overflow: 'hidden' };
  const whiteBox: React.CSSProperties = { background: '#fff', padding: '6px', borderRadius: '10px' };
  const blueBox: React.CSSProperties = { background: '#e1f5fe', padding: '6px', borderRadius: '10px' };
  const label: React.CSSProperties = { fontSize: '10px', fontWeight: 'bold', color: '#666', display: 'block' };
  const input: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: '900', width: '100%', outline: 'none' };
  const dualInput: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: '900', width: '50%', textAlign: 'center', background: 'transparent', outline: 'none' };
  const tagIn: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', width: '80px', borderRadius: '4px', padding: '2px' };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '30px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '18px', textAlign: 'center', borderBottom: '4px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>BEAM BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={card}>
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between' }}>
                <input value={row.tag} onChange={e => updateRow(row.id, 'tag', e.target.value)} style={tagIn} />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: 'red', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={whiteBox}><label style={label}>Width(mm)</label><input value={row.width} onChange={e=>updateRow(row.id,'width',e.target.value)} style={input}/></div>
                <div style={whiteBox}><label style={label}>Depth(mm)</label><input value={row.depth} onChange={e=>updateRow(row.id,'depth',e.target.value)} style={input}/></div>
                <div style={whiteBox}><label style={label}>Main(Ft)</label><input value={row.mainLen} onChange={e=>updateRow(row.id,'mainLen',e.target.value)} style={input}/></div>

                {/* DUAL COLUMN INPUTS */}
                <div style={blueBox}><label style={label}>Bot 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.bot16} onChange={e=>updateRow(row.id,'bot16',e.target.value)} style={dualInput}/><input value={row.bot12} onChange={e=>updateRow(row.id,'bot12',e.target.value)} style={dualInput}/></div>
                </div>
                <div style={blueBox}><label style={label}>Top 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.top16} onChange={e=>updateRow(row.id,'top16',e.target.value)} style={dualInput}/><input value={row.top12} onChange={e=>updateRow(row.id,'top12',e.target.value)} style={dualInput}/></div>
                </div>
                <div style={blueBox}><label style={label}>Ext 16 / 12</label>
                  <div style={{display:'flex'}}><input value={row.ext16} onChange={e=>updateRow(row.id,'ext16',e.target.value)} style={dualInput}/><input value={row.ext12} onChange={e=>updateRow(row.id,'ext12',e.target.value)} style={dualInput}/></div>
                </div>

                <div style={whiteBox}><label style={label}>Ex Len(ft)</label><input value={row.exLen} onChange={e=>updateRow(row.id,'exLen',e.target.value)} style={input}/></div>
                <div style={whiteBox}><label style={label}>Spacing(in)</label><input value={row.stirrupSp} onChange={e=>updateRow(row.id,'stirrupSp',e.target.value)} style={input}/></div>
                <div style={whiteBox}><label style={label}>Stirrup Dia</label>
                    <select value={row.stirrupDia} onChange={e=>updateRow(row.id,'stirrupDia',e.target.value)} style={{border:'none', fontWeight:'900', width:'100%'}}>
                        <option value="8">8mm</option><option value="10">10mm</option>
                    </select>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '2px solid #0070c0' }}>
                <span>STIRRUPS: {row.stirrupDia}mm @ {row.stirrupSp}"</span>
                <span>{res.total.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={{ background: '#fff', border: '2px solid #0070c0', borderRadius: '15px', padding: '15px', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', color: '#0070c0', margin: '0 0 10px 0' }}>TOTAL BEAM STEEL</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' }}><span>16mm Steel:</span><span>{computedData.summary[16].toFixed(2)} KG</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc', fontWeight: 'bold' }}><span>12mm Steel:</span><span>{computedData.summary[12].toFixed(2)} KG</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold' }}><span>8mm Steel:</span><span>{computedData.summary[8].toFixed(2)} KG</span></div>
        </div>

        <button onClick={() => setRows([...rows, { ...rows[0], id: Date.now(), tag: `B${rows.length + 1}` }])} style={{ width: '100%', padding: '15px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' }}>+ ADD NEW BEAM</button>
        <button onClick={generatePDF} style={{ width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' }}>DOWNLOAD PROJECT PDF</button>
        <button onClick={shareWhatsApp} style={{ width: '100%', padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}
