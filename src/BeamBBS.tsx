import React, { useState, useMemo, useCallback } from 'react';

// --- DATA FROM EXCEL IMAGES 15-26 (P through AA) ---
const BUNDLE_CONFIG: Record<number, { weight: number; rods: number }> = {
  8:  { weight: 47.40, rods: 10 },
  10: { weight: 51.87, rods: 7 },
  12: { weight: 53.35, rods: 5 },
  16: { weight: 56.88, rods: 3 },
  20: { weight: 59.26, rods: 2 },
  25: { weight: 46.30, rods: 1 }
};

// PRECISE DIVIDERS FROM IMAGES 12 & 14
const DIVIDER_MAIN = 3.281;  
const DIVIDER_EXTRA = 3.2811; 
const ROD_LEN_STD = 12; // Standard Rod length used in divisor (Image 27)

const BeamBBS = () => {
  const [beams, setBeams] = useState([
    {
      id: Date.now(),
      grid: 'A',
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

  // ... (updateBeam function remains the same) ...

  const totals = useMemo(() => {
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };

    beams.forEach(b => {
      const L_Main = parseFloat(b.mainFt) || 0;
      const L_Ex = parseFloat(b.exFt) || 0;

      // EXCEL ENGINE: Follows Columns AB through AM exactly
      const calcExcelKg = (dia: number, nosStr: string, lengthFt: number, divider: number) => {
        const n = parseFloat(nosStr) || 0;
        if (n === 0 || !BUNDLE_CONFIG[dia]) return 0;

        const config = BUNDLE_CONFIG[dia];

        // 1. Convert to Meters (Columns M, N, O)
        const meters = (lengthFt * n) / divider;

        // 2. Convert to Required Bundles (Columns AB through AG)
        // Formula: Meters / Reference_Rod_Len / Rods_Per_Bundle
        const bundles = meters / ROD_LEN_STD / config.rods;

        // 3. Convert Bundles to KG (Columns AH through AM)
        return bundles * config.weight;
      };

      // SUMMING EACH POSITION (Matching Excel AH6, AI6, AJ6, AK6, AL6, AM6)
      summary[b.bottom1.dia] += calcExcelKg(b.bottom1.dia, b.bottom1.nos, L_Main, DIVIDER_MAIN);
      summary[b.bottom2.dia] += calcExcelKg(b.bottom2.dia, b.bottom2.nos, L_Main, DIVIDER_MAIN);
      summary[b.top1.dia]    += calcExcelKg(b.top1.dia, b.top1.nos, L_Main, DIVIDER_MAIN);
      summary[b.top2.dia]    += calcExcelKg(b.top2.dia, b.top2.nos, L_Main, DIVIDER_MAIN);
      
      // EXTRAS use the specific 3.2811 divider
      summary[b.ex1.dia]     += calcExcelKg(b.ex1.dia, b.ex1.nos, L_Ex, DIVIDER_EXTRA);
      summary[b.ex2.dia]     += calcExcelKg(b.ex2.dia, b.ex2.nos, L_Ex, DIVIDER_EXTRA);

      // 8mm STIRRUPS (Image 33 Logic)
      // Stirrups use 3.5ft cutting length and 3.281 divider
      const spacing = parseFloat(b.spacing) || 6;
      const stirrupQty = Math.floor((L_Main * 12) / spacing) + 1;
      summary[8] += calcExcelKg(8, stirrupQty.toString(), 3.5, DIVIDER_MAIN);
    });

    return summary;
  }, [beams]);

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '20px' }}>
      {/* UI Code here... */}
      <div style={{ backgroundColor: '#fff', padding: '20px', border: '2px solid #1565c0', borderRadius: '15px' }}>
        <h3 style={{ textAlign: 'center', color: '#1565c0' }}>PROJECT TOTALS (MATCHES EXCEL)</h3>
        {Object.entries(totals).map(([dia, kg]) => kg > 0 && (
          <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
             <span>{dia}mm Steel:</span>
             <strong>{kg.toFixed(2)} KG</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
