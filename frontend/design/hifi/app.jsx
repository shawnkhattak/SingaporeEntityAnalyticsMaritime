// SEAM V2 Hi-fi — design canvas wrapper.

function HiFiApp() {
  return (
    <DesignCanvas
      title="SEAM V2 — Hi-fi"
      subtitle="Frosted glass over the spec palette. Pan with space+drag, scroll to zoom, ⤢ for fullscreen on any artboard."
    >
      <DCSection id="foundations" title="Foundations" subtitle="Palette, type scale, components.">
        <DCArtboard id="foundations" label="00 · Foundations" width={1440} height={1280}>
          <HFoundations/>
        </DCArtboard>
      </DCSection>

      <DCSection id="map" title="Map Workspace" subtitle="The canvas. Floating command panel; inspectors slide in from the left.">
        <DCArtboard id="map-empty" label="01 · Map — empty / first-run" width={1440} height={900}>
          <HMapEmpty/>
        </DCArtboard>
        <DCArtboard id="map-loaded" label="02 · Map — loaded (vessel selected)" width={1440} height={900}>
          <HMapLoaded/>
        </DCArtboard>
        <DCArtboard id="vessels-list" label="03 · Vessels list inspector" width={1440} height={900}>
          <HVesselsList/>
        </DCArtboard>
        <DCArtboard id="vessel-detail" label="04 · Vessel detail inspector" width={1440} height={900}>
          <HVesselInspector/>
        </DCArtboard>
        <DCArtboard id="entity-detail" label="05 · Entity detail inspector" width={1440} height={900}>
          <HEntityDetail/>
        </DCArtboard>
      </DCSection>

      <DCSection id="feeds" title="Feeds" subtitle="Risk, sanctions, ports, news.">
        <DCArtboard id="risk" label="06 · Risk feed" width={1440} height={900}>
          <HRiskFeed/>
        </DCArtboard>
        <DCArtboard id="sanctions" label="07 · Sanctions matches" width={1440} height={900}>
          <HSanctions/>
        </DCArtboard>
        <DCArtboard id="ports" label="08 · Ports — due to arrive" width={1440} height={900}>
          <HPorts/>
        </DCArtboard>
        <DCArtboard id="news" label="09 · News" width={1440} height={900}>
          <HNews/>
        </DCArtboard>
      </DCSection>

      <DCSection id="fullcanvas" title="Full-canvas surfaces" subtitle="Map intentionally hidden.">
        <DCArtboard id="ops" label="10 · Operations Console" width={1440} height={900}>
          <HOpsConsole/>
        </DCArtboard>
        <DCArtboard id="graph" label="11 · Graph (subject selected)" width={1440} height={900}>
          <HGraph/>
        </DCArtboard>
        <DCArtboard id="schema" label="12 · Schema atlas" width={1440} height={900}>
          <HSchema/>
        </DCArtboard>
        <DCArtboard id="evidence" label="13 · Evidence JSON inspector" width={1440} height={900}>
          <HEvidenceJSON/>
        </DCArtboard>
      </DCSection>

      <DCSection id="overlays" title="Overlays & system states" subtitle="Modals, palette, error, roadmap.">
        <DCArtboard id="palette" label="14 · Command palette (⌘K)" width={1440} height={900}>
          <HCommandPaletteScreen/>
        </DCArtboard>
        <DCArtboard id="modal-toasts" label="15 · Confirm modal + toast stack" width={1440} height={900}>
          <HModalToasts/>
        </DCArtboard>
        <DCArtboard id="roadmap" label="16 · Roadmap" width={1440} height={900}>
          <HRoadmap/>
        </DCArtboard>
        <DCArtboard id="error" label="17 · Error — backend unreachable" width={1440} height={900}>
          <HErrorState/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HiFiApp/>);
