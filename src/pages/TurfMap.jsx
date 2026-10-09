import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CRS, latLngBounds } from 'leaflet'
import { Link } from 'react-router'
import { ImageOverlay, MapContainer, Pane, TileLayer, ZoomControl } from 'react-leaflet'
import { Icon, LOGO, Page, ThemeToggle, btnGhost } from '../ui'

// Liberty City tiles with the orange coastline glow baked in (scripts/build-map-tiles.py). Zoom 2–5.
const TILES = `${import.meta.env.BASE_URL}map-tiles/{z}/{x}/{y}.webp`
// Whole map in one image, kept underneath the tiles: while zooming, any area whose sharp tiles
// haven't loaded yet shows this instead of a cut-off edge.
const BACKDROP = `${import.meta.env.BASE_URL}map-tiles/full.webp`
// Flat game map (CRS.Simple): 1 unit = 8px at zoom 3. The tiles cover 6x4 tiles at zoom 3
// = 1536x1024px = 192x128 units, with y growing downward (negative "lat").
const BOUNDS = [[-128, 0], [0, 192]]
// TFB logo pinned in the water top-right of the city (moves/zooms with the map).
const LOGO_BOUNDS = [[-35.9, 148.6], [-5, 179.3]]
const SEA = '#5E7C8F' // exact sea color of the tiles, so the area outside them blends in

export default function TurfMap() {
  const [map, setMap] = useState(null)

  // Zoom out stops where the whole city fits. The draggable area (maxBounds) is exactly the
  // screen at that zoom, so it is never smaller than the view; that mismatch is what made
  // Leaflet's edge clamping fight the zoom and jitter.
  useEffect(() => {
    if (!map) return
    const fit = () => {
      map.setMaxBounds(null)
      const z = map.getBoundsZoom(BOUNDS)
      const c = map.project(latLngBounds(BOUNDS).getCenter(), z)
      const half = map.getSize().divideBy(2)
      map.setMinZoom(z)
      map.setMaxBounds(latLngBounds(map.unproject(c.subtract(half), z), map.unproject(c.add(half), z)).extend(BOUNDS))
      if (map.getZoom() < z) map.setView(latLngBounds(BOUNDS).getCenter(), z, { animate: false })
    }
    fit()
    map.on('resize', fit)
    return () => map.off('resize', fit)
  }, [map])

  return (
    <Page className="h-dvh overflow-hidden">
      <MapContainer
        ref={setMap}
        crs={CRS.Simple}
        bounds={BOUNDS}
        maxBoundsViscosity={1}
        minZoom={2}
        maxZoom={5}
        zoomSnap={0.5}
        zoomDelta={0.5}
        bounceAtZoomLimits={false}
        zoomControl={false}
        attributionControl={false}
        className="absolute inset-0"
        style={{ background: SEA }}
      >
        <Pane name="backdrop" style={{ zIndex: 150 }}>
          <ImageOverlay url={BACKDROP} bounds={BOUNDS} />
        </Pane>
        <TileLayer url={TILES} minNativeZoom={2} maxNativeZoom={5} bounds={BOUNDS} keepBuffer={4} />
        <ImageOverlay url={LOGO} bounds={LOGO_BOUNDS} />
        <ZoomControl position="bottomleft" />
      </MapContainer>

      {/* Top-left: back + theme */}
      <div className="absolute top-4 left-4 z-[500] flex gap-2">
        <Link to="/" className={`${btnGhost} px-3.5 py-2 shadow-lg`}>
          <Icon name="back" className="size-4" /> Back to hub
        </Link>
        <ThemeToggle className="shadow-lg" />
      </div>

      {/* Right panel */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute top-4 right-4 z-[500] w-[calc(100%-2rem)] max-w-64 rounded-2xl border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="" className="size-8 object-contain" />
          <h1 className="font-semibold">The Five Boroughs</h1>
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
          <Icon name="map" className="size-6 text-accent" />
          <p className="font-display text-sm font-bold uppercase">Will Be Updated Soon</p>
          <p className="text-xs text-zinc-500">Illegal Civ turfs will be listed here.</p>
        </div>
      </motion.aside>
    </Page>
  )
}
