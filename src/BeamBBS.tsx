import React, { useState, useMemo } from 'react';

// Reference Data from your Excel Image 50
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
  stirrupSpInch: string;
}

export default function BeamBBSCalculator() {
  const [rows, setRows] = useState<BeamRow[]>([
    { 
      id: 1, tag: 'B1', widthMm: '230', depthMm: '380', mainLenFt: '60', extraLenFt: '30',
      bot16: '1', bot12: '1', top16: '1', top12: '1', ext16: '1', ext12: '1',
      stirrupSpInch: '6'
    }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const mainL = parseFloat(r.mainLenFt) || 0;
      const extraL = parseFloat(r.extraLenFt) || 0;
      const w = parseFloat(r.widthMm) || 0;
      const d = parseFloat(r.depthMm) || 0;
      const sp = parseFloat(r.stirrupSpInch) || 6;

      // 1. Calculate Main Steel Weights
      const calcKg = (lenFt: number, nos: string, dia: number) => {
        const count = parseFloat(nos) || 0;
        if (count === 0) return 0;
        const totalM = (lenFt * count) / 3.281;
        const ref = STEEL_REF[dia];
        return (totalM / 12.19 / ref.rodsPerBundle) * ref.bundleWt;
      };

      const kg16 = calcKg(mainL, r.bot16, 16) + calcKg(mainL, r.top16, 16) + calcKg(extraL, r.ext16, 16);
      const kg12 = calcKg(mainL, r.bot12, 12) + calcKg(mainL, r.top12, 12) + calcKg(extraL, r.ext12, 12);

      // 2. Stirrup Logic: (2*((W/25.4)+(D/25.4))-6)/12
      const stirrupCutFt = (2 * ((w / 25.4) + (d / 25.4)) - 6) / 12;
      const stirrupNos = Math.ceil((mainL * 12) / sp);
      const stirrupTotalM = (stirrupCutFt * stirrupNos) / 3.281;
      const sRef = STEEL_REF[8]; // Assuming 8mm stirrups
      const stirrupKg = (stirrupTotalM / 12.19 / sRef.rodsPerBundle) * sRef.bundleWt;

      const rowTotal = kg16 + kg12 + stirrupKg;

      return { ...r, kg16, kg12, stirrupKg, totalKg: rowTotal };
    });

    const summary = { 8: 0, 12: 0, 16: 0 };
    results.forEach(res => {
      summary[8] += res.stirrupKg;
      summary[12] += res.kg12;
      summary[16] += res.kg16;
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof BeamRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const shareToWhatsApp = () => {
    let msg = `*BEAM BBS FINAL REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      msg += `*${r.tag}*: ${r.widthMm}x${r.depthMm} | *${r.totalKg.toFixed(2)} KG*%0A`;
    });
    msg += `%0A*TOTAL SUMMARY:*%0A8mm: ${computedData.summary[8].toFixed(2)} KG%0A12mm: ${computedData.summary[12].toFixed(2)} KG%0A16mm: ${computedData.summary[16].toFixed(2)} KG`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', paddingBottom: '30px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '18px', textAlign: 'center', borderBottom: '4px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#000' }}>BEAM BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '15px', border: '2px solid #0070c0', marginBottom: '15px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {/* Header */}
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input value={row.tag} onChange={e => updateRow(row.id, 'tag', e.target.value)} style={tagInputStyle} />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={remBtnStyle}>REMOVE</button>
              </div>

              {/* Main Inputs */}
              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={boxStyle}><label style={lblStyle}>Width(mm)</label><input type="number" value={row.widthMm} onChange={e => updateRow(row.id, 'widthMm', e.target.value)} style={inptStyle} /></div>
                <div style={boxStyle}><label style={lblStyle}>Depth(mm)</label><input type="number" value={row.depthMm} onChange={e => updateRow(row.id, 'depthMm', e.target.value)} style={inptStyle} /></div>
                <div style={boxStyle}><label style={lblStyle}>Main(Ft)</label><input type="number" value={row.mainLenFt} onChange={e => updateRow(row.id, 'mainLenFt', e.target.value)} style={inptStyle} /></div>
                
                {/* Rod Detail Inputs (Controllable Blue Cells) */}
                <div style={blueInputStyle}><label style={lblStyle}>Bot 16/12</label>
                  <div style={{ display: 'flex' }}>
                    <input value={row.bot16} onChange={e => updateRow(row.id, 'bot16', e.target.value)} style={smallInpt} />
                    <input value={row.bot12} onChange={e => updateRow(row.id, 'bot12', e.target.value)} style={smallInpt} />
                  </div>
                </div>
                <div style={blueInputStyle}><label style={lblStyle}>Top 16/12</label>
                  <div style={{ display: 'flex' }}>
                    <input value={row.top16} onChange={e => updateRow(row.id, 'top16', e.target.value)} style={smallInpt} />
                    <input value={row.top12} onChange={e => updateRow(row.id, 'top12', e.target.value)} style={smallInpt} />
                  </div>
                </div>
                <div style={blueInputStyle}><label style={lblStyle}>Ext 16/12</label>
                  <div style={{ display: 'flex' }}>
                    <input value={row.ext16} onChange={e => updateRow(row.id, 'ext16', e.target.value)} style={smallInpt} />
                    <input value={row.ext12} onChange={e => updateRow(row.id, 'ext12', e.target.value)} style={smallInpt} />
                  </div>
                </div>

                <div style={boxStyle}><label style={lblStyle}>Ex Len(ft)</label><input type="number" value={row.extraLenFt} onChange={e => updateRow(row.id, 'extraLenFt', e.target.value)} style={inptStyle} /></div>
                <div style={boxStyle}><label style={lblStyle}>Spacing(in)</label><input type="number" value={row.stirrupSpInch} onChange={e => updateRow(row.id, 'stirrupSpInch', e.target.value)} style={inptStyle} /></div>
              </div>

              {/* Result Bar */}
              <div style={{ backgroundColor: '#ffff00', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '2px solid #0070c0' }}>
                <span style={{ fontSize: '15px' }}>STIRRUPS: 8mm @ {row.stirrupSpInch}"</span>
                <span style={{ fontSize: '18px' }}>{res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        {/* Summary Card */}
        <div style={summaryCardStyle}>
          <h2 style={{ fontSize: '20px', textAlign: 'center', color: '#0070c0', margin: '0 0 15px 0' }}>TOTAL BEAM STEEL</h2>
          <div style={sumRowStyle}><span>8mm Steel:</span><span>{computedData.summary[8].toFixed(2)} KG</span></div>
          <div style={sumRowStyle}><span>12mm Steel:</span><span>{computedData.summary[12].toFixed(2)} KG</span></div>
          <div style={sumRowStyle}><span>16mm Steel:</span><span>{computedData.summary[16].toFixed(2)} KG</span></div>
        </div>

        <button onClick={() => setRows([...rows, { id: Date.now(), tag: `B${rows.length + 1}`, widthMm: '230', depthMm: '380', mainLenFt: '10', extraLenFt: '5', bot16: '2', bot12: '0', top16: '2', top12: '0', ext16: '0', ext12: '0', stirrupSpInch: '6' }])} style={btnBlueStyle}>+ ADD NEW BEAM</button>
        <button onClick={shareToWhatsApp} style={btnGreenStyle}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}

// Inline Styles to exactly match image_c2c520
const boxStyle: React.CSSProperties = { background: '#fff', padding: '8px', borderRadius: '10px' };
const blueInputStyle: React.CSSProperties = { background: '#e1f5fe', padding: '8px', borderRadius: '10px' };
const lblStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '2px' };
const inptStyle: React.CSSProperties = { border: 'none', fontSize: '17px', fontWeight: '900', width: '100%', outline: 'none' };
const smallInpt: React.CSSProperties = { border: 'none', fontSize: '17px', fontWeight: '900', width: '50%', textAlign: 'center', background: 'transparent', outline: 'none' };
const tagInputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', outline: 'none' };
const remBtnStyle: React.CSSProperties = { background: '#ff0000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' };
const summaryCardStyle: React.CSSProperties = { background: '#fff', border: '3px solid #0070c0', borderRadius: '15px', padding: '20px', marginBottom: '20px' };
const sumRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #ccc', fontSize: '18px', fontWeight: '900' };
const btnBlueStyle: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', marginBottom: '12px', fontSize: '15px' };
const btnGreenStyle: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '15px' };
