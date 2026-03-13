import React, { useState, useMemo } from "react";

const FT_TO_M = 3.281;

const BeamBBS = () => {
  const [beam, setBeam] = useState({
    width: "230",
    depth: "380",
    mainFt: "60",
    exFt: "30",
    spacingIn: "6",

    bottom16: "1",
    bottom12: "1",

    top16: "1",
    top12: "1",

    extra16: "1",
    extra12: "1"
  });

  const totals = useMemo(() => {

    const L_MainM = (parseFloat(beam.mainFt) || 0) / FT_TO_M;
    const L_ExM = (parseFloat(beam.exFt) || 0) / FT_TO_M;

    // Excel Steel Formula
    const steelWeight = (dia, nosStr, lengthM) => {
      const n = parseFloat(nosStr) || 0;
      if (n <= 0) return 0;

      return ((dia * dia) / 162) * lengthM * n;
    };

    // -------- 16mm --------

    const bottom16 = steelWeight(16, beam.bottom16, L_MainM);
    const top16 = steelWeight(16, beam.top16, L_MainM);
    const extra16 = steelWeight(16, beam.extra16, L_ExM);

    const final16 = bottom16 + top16 + extra16;

    // -------- 12mm --------

    const bottom12 = steelWeight(12, beam.bottom12, L_MainM);
    const top12 = steelWeight(12, beam.top12, L_MainM);
    const extra12 = steelWeight(12, beam.extra12, L_ExM);

    const final12 = bottom12 + top12 + extra12;

    // -------- Stirrup 8mm --------

    const qty8 =
      Math.floor(
        ((parseFloat(beam.mainFt) || 0) * 12) /
          (parseFloat(beam.spacingIn) || 6)
      ) + 1;

    const stirrupLength = 3.5 / FT_TO_M;

    const final8 = ((8 * 8) / 162) * stirrupLength * qty8;

    // -------- Concrete --------

    const concrete =
      (parseFloat(beam.width) / 1000) *
      (parseFloat(beam.depth) / 1000) *
      L_MainM;

    return {
      final16,
      final12,
      final8,
      concrete
    };
  }, [beam]);

  return (
    <div
      style={{
        padding: "20px",
        background: "#f5f8fa",
        minHeight: "100vh",
        fontFamily: "Arial"
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
          boxShadow: "0 5px 25px rgba(0,0,0,0.1)"
        }}
      >
        <h2
          style={{
            color: "#1a73e8",
            textAlign: "center",
            marginBottom: "30px"
          }}
        >
          Beam BBS Automation
        </h2>

        {/* Dimensions */}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "15px" }}>
          <InputBox label="Width(mm)" val={beam.width} set={(v)=>setBeam({...beam,width:v})}/>
          <InputBox label="Depth(mm)" val={beam.depth} set={(v)=>setBeam({...beam,depth:v})}/>
          <InputBox label="Main Length(ft)" val={beam.mainFt} set={(v)=>setBeam({...beam,mainFt:v})}/>
        </div>

        {/* Rods */}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",marginTop:"25px"}}>

          <Section label="Bottom Rods (Nos)">
            <RodRow dia="16mm" val={beam.bottom16} set={(v)=>setBeam({...beam,bottom16:v})}/>
            <RodRow dia="12mm" val={beam.bottom12} set={(v)=>setBeam({...beam,bottom12:v})}/>
          </Section>

          <Section label="Top Rods (Nos)">
            <RodRow dia="16mm" val={beam.top16} set={(v)=>setBeam({...beam,top16:v})}/>
            <RodRow dia="12mm" val={beam.top12} set={(v)=>setBeam({...beam,top12:v})}/>
          </Section>

        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",marginTop:"20px"}}>

          <Section label="Extra Rods (Nos)">
            <RodRow dia="16mm" val={beam.extra16} set={(v)=>setBeam({...beam,extra16:v})}/>
            <RodRow dia="12mm" val={beam.extra12} set={(v)=>setBeam({...beam,extra12:v})}/>
          </Section>

          <div style={{display:"flex",flexDirection:"column",gap:"15px"}}>
            <InputBox label="Extra Length(ft)" val={beam.exFt} set={(v)=>setBeam({...beam,exFt:v})}/>
            <InputBox label="Spacing(in)" val={beam.spacingIn} set={(v)=>setBeam({...beam,spacingIn:v})}/>
          </div>

        </div>

        {/* Results */}

        <div style={{marginTop:"40px",border:"2px solid #1a73e8",borderRadius:"12px",overflow:"hidden"}}>

          <div style={{background:"#1a73e8",color:"#fff",padding:"15px",textAlign:"center",fontSize:"20px"}}>
            PROJECT TOTALS (EXCEL LOGIC)
          </div>

          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"18px"}}>
            <tbody>

              <TableRow label="8mm Steel Total" val={totals.final8.toFixed(2)+" KG"}/>
              <TableRow label="12mm Steel Total" val={totals.final12.toFixed(2)+" KG"}/>
              <TableRow label="16mm Steel Total" val={totals.final16.toFixed(2)+" KG"}/>
              <TableRow label="Concrete Volume" val={totals.concrete.toFixed(3)+" m³"} highlight/>

            </tbody>
          </table>

        </div>

      </div>
    </div>
  );
};

const InputBox = ({label,val,set}) => (
  <div style={{background:"#f1f3f4",padding:"12px",borderRadius:"8px"}}>
    <label style={{fontSize:"12px",fontWeight:"bold"}}>{label}</label>
    <input
      type="number"
      value={val}
      onChange={(e)=>set(e.target.value)}
      style={{width:"100%",border:"none",fontSize:"18px",textAlign:"center",background:"transparent"}}
    />
  </div>
);

const RodRow = ({dia,val,set}) => (
  <div style={{display:"flex",gap:"10px",marginBottom:"8px"}}>
    <div style={{flex:1,background:"#e8f0fe",padding:"10px",textAlign:"center",color:"#1a73e8",fontWeight:"bold"}}>
      {dia}
    </div>
    <input
      type="number"
      value={val}
      onChange={(e)=>set(e.target.value)}
      style={{flex:1,background:"#1a73e8",color:"#fff",border:"none",textAlign:"center"}}
    />
  </div>
);

const Section = ({label,children}) => (
  <div style={{border:"1px solid #e0e0e0",padding:"15px",borderRadius:"12px"}}>
    <div style={{fontWeight:"bold",color:"#1a73e8",marginBottom:"10px"}}>
      {label}
    </div>
    {children}
  </div>
);

const TableRow = ({label,val,highlight}) => (
  <tr style={{background:highlight ? "#f8f9fa":"#fff"}}>
    <td style={{padding:"20px",fontWeight:"bold"}}>{label}</td>
    <td style={{padding:"20px",textAlign:"right",fontWeight:"bold"}}>{val}</td>
  </tr>
);

export default BeamBBS;
