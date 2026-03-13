const totals = useMemo(() => {

  const L_Main = parseFloat(beam.mainFt) || 0
  const L_Ex = parseFloat(beam.exFt) || 0

  const steelWeight = (dia:number, nosStr:string, length:number) => {
    const n = parseFloat(nosStr) || 0
    if (n <= 0) return 0

    // Excel logic using feet
    return ((dia * dia) / 162) * length * n
  }

  // 16mm
  const bottom16 = steelWeight(16, beam.bottom16, L_Main)
  const top16 = steelWeight(16, beam.top16, L_Main)
  const extra16 = steelWeight(16, beam.extra16, L_Ex)

  const final16 = bottom16 + top16 + extra16

  // 12mm
  const bottom12 = steelWeight(12, beam.bottom12, L_Main)
  const top12 = steelWeight(12, beam.top12, L_Main)
  const extra12 = steelWeight(12, beam.extra12, L_Ex)

  const final12 = bottom12 + top12 + extra12

  // stirrups
  const qty8 =
    Math.floor(((parseFloat(beam.mainFt) || 0) * 12) /
    (parseFloat(beam.spacingIn) || 6)) + 1

  const stirrupLength = 3.5

  const final8 = ((8 * 8) / 162) * stirrupLength * qty8

  const concrete =
    (parseFloat(beam.width)/1000) *
    (parseFloat(beam.depth)/1000) *
    (L_Main/3.281)

  return { final16, final12, final8, concrete }

}, [beam])
