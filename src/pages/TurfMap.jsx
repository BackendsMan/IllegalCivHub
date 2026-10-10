import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CRS, latLngBounds } from 'leaflet'
import { Link } from 'react-router'
import { ImageOverlay, MapContainer, Pane, Polygon, Popup, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'
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
// Street photos per turf: public/turf-photos/<folder>/1.webp, 2.webp, ...
const shots = (folder, n) => Array.from({ length: n }, (_, i) => `${import.meta.env.BASE_URL}turf-photos/${folder}/${i + 1}.webp`)
// Turfs as polygons in map units ([-y, x] points, same space as BOUNDS), traced along the streets
// around each crew's block. Styled like tfb.turf-map.io: 35% fill, black border, brighter on hover.
const TURFS = [
  { name: 'ATM / Addicted To Money', photos: shots('atm', 3), area: 'Harlem', color: '#e11d48', points: [[-29.8, 68.3], [-29.8, 74.5], [-34.8, 74.5], [-34.8, 68.3]] },
  { name: 'Gside / GSB', photos: shots('gside', 4), area: 'The Bronx', color: '#16a34a', points: [[-29, 98.6], [-29, 104.2], [-30, 104.6], [-31.3, 104.8], [-32.9, 104.5], [-34, 103.6], [-34, 98.6]] },
  { name: 'TMB / The Motion Boys', photos: shots('tmb', 3), area: 'Queens', color: '#a855f7', points: [[-53.3, 125.4], [-53.3, 128.9], [-59.8, 128.9], [-59.8, 125.4]] },
  { name: 'MulaBoysENT', photos: shots('mulaboys', 2), area: 'Brooklyn', color: '#eab308', points: [[-80.1, 111.9], [-80.1, 115.6], [-84.9, 115.6], [-84.9, 111.9]] },
  { name: 'H.O.E / Hoopers Over Everything', photos: shots('hoe', 3), area: 'Brooklyn', color: '#3b82f6', points: [[-90.7, 117.8], [-90.3, 120.9], [-90.1, 123.7], [-95.9, 123.7], [-95.9, 117.8]] },
]
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const center = (pts) => pts.reduce(([a, b], [y, x]) => [a + y / pts.length, b + x / pts.length], [0, 0])
const turfStyle = (color, hot) => ({ color: '#000', weight: hot ? 3 : 2, fillColor: color, fillOpacity: hot ? 0.55 : 0.35 })

export default function TurfMap() {
  const [map, setMap] = useState(null)
  const [selected, setSelected] = useState(null) // name of the turf whose popup is open
  const [query, setQuery] = useState('')
  const [labels, setLabels] = useState(false)
  const [shown, setShown] = useState(true) // Factions layer on/off
  const [openList, setOpenList] = useState(true) // Factions group expanded
  const [copied, setCopied] = useState('') // 'coords' | 'link': flashes a check on that button
  const [shot, setShot] = useState(0) // photo index in the open turf's gallery
  const [viewer, setViewer] = useState(false) // full-screen photo viewer
  const popupRef = useRef(null)
  const turf = TURFS.find((t) => t.name === selected)
  // Stable per turf, so re-renders (flipping photos) don't reset the flipped position.
  const popupAt = useMemo(() => turf && [Math.max(...turf.points.map(([y]) => y)), center(turf.points)[1]], [turf])
  const photos = turf?.photos ?? []
  const step = (d) => setShot((i) => (i + d + photos.length) % photos.length)
  const list = TURFS.filter((t) => `${t.name} ${t.area}`.toLowerCase().includes(query.trim().toLowerCase()))

  const open = (t) => {
    setShown(true)
    setSelected(t.name)
    map?.flyToBounds(t.points, { maxZoom: 4, paddingTopLeft: [0, 420] }) // leaves room for the popup above
  }

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }

  const share = (t) => {
    const url = `${location.href.split('?')[0]}?turf=${slug(t.name)}` // hash route: …/#/map?turf=x
    if (navigator.share) navigator.share({ title: t.name, url }).catch(() => {})
    else copy('link', url)
  }

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

  useEffect(() => {
    setShot(0)
    setViewer(false)
  }, [selected])

  // Viewer keys: arrows flip photos, Esc closes.
  useEffect(() => {
    if (!viewer) return
    const onKey = (e) => {
      if (e.key === 'Escape') setViewer(false)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [viewer, photos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // The popup sits above the turf, but flips below it when the screen has no room above
  // (upper Harlem, the Bronx). The map can't pan to make room at full zoom-out.
  useEffect(() => {
    if (!map || !turf) return
    const lats = turf.points.map(([y]) => y)
    const x = center(turf.points)[1]
    const place = () => {
      const p = popupRef.current
      const el = p?.getElement()
      if (!el) return
      const h = el.querySelector('.leaflet-popup-content-wrapper').offsetHeight
      const above = map.latLngToContainerPoint([Math.max(...lats), x]).y
      const below = map.getSize().y - map.latLngToContainerPoint([Math.min(...lats), x]).y
      const flip = above < h + 40 && below > above
      p.options.offset = [0, flip ? h + 40 : 7]
      p.setLatLng([flip ? Math.min(...lats) : Math.max(...lats), x])
      el.classList.toggle('flip', flip)
    }
    const raf = requestAnimationFrame(place)
    map.on('zoomend moveend', place)
    return () => {
      cancelAnimationFrame(raf)
      map.off('zoomend moveend', place)
    }
  }, [map, turf])

  // A shared link (?turf=mulaboysent) opens that turf once the map is ready.
  useEffect(() => {
    const t = TURFS.find((t) => slug(t.name) === new URLSearchParams(location.hash.split('?')[1]).get('turf'))
    if (map && t) open(t)
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {shown &&
          TURFS.map((t) => (
            <Polygon
              key={t.name}
              positions={t.points}
              pathOptions={turfStyle(t.color, t.name === selected)}
              eventHandlers={{
                click: () => setSelected(t.name),
                mouseover: (e) => e.target.setStyle(turfStyle(t.color, true)),
                mouseout: (e) => e.target.setStyle(turfStyle(t.color, t.name === selected)),
              }}
            >
              {labels && (
                <Tooltip permanent direction="center" className="turf-label">
                  {t.name}
                </Tooltip>
              )}
            </Polygon>
          ))}
        {shown && turf && (
          <Popup
            ref={popupRef}
            autoPan={false}
            key={turf.name}
            position={popupAt}
            className="turf-popup"
            closeButton={false}
            minWidth={300}
            maxWidth={340}
            eventHandlers={{ remove: () => setSelected((s) => (s === turf.name ? null : s)) }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="!m-0 text-base font-semibold text-zinc-100">{turf.name}</p>
                <p className="!m-0 text-sm text-zinc-500">{turf.area}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 text-zinc-400 hover:border-accent/60 hover:text-zinc-100"
              >
                <Icon name="x" className="size-4" />
              </button>
            </div>
            {photos.length > 0 && (
              <div className="mt-3">
                <div className="group relative aspect-video overflow-hidden rounded-lg bg-ink-800">
                  <img
                    src={photos[shot]}
                    alt={`${turf.name} photo ${shot + 1}`}
                    onClick={() => setViewer(true)}
                    className="size-full cursor-zoom-in object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button onClick={() => step(-1)} aria-label="Previous photo" className="absolute top-1/2 left-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 focus-visible:opacity-100">
                        <Icon name="back" className="size-4" />
                      </button>
                      <button onClick={() => step(1)} aria-label="Next photo" className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 focus-visible:opacity-100">
                        <Icon name="back" className="size-4 rotate-180" />
                      </button>
                    </>
                  )}
                  <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    {shot + 1} / {photos.length}
                  </span>
                </div>
                {photos.length > 1 && (
                  <div className="mt-2 flex gap-1.5">
                    {photos.map((src, i) => (
                      <button
                        key={src}
                        onClick={() => setShot(i)}
                        aria-label={`Photo ${i + 1}`}
                        className={`aspect-video flex-1 overflow-hidden rounded-md ring-2 transition ${i === shot ? 'ring-accent' : 'opacity-60 ring-transparent hover:opacity-100'}`}
                      >
                        <img src={src} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <button
                onClick={() => copy('coords', center(turf.points).map((n) => n.toFixed(1)).join(', '))}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-200 hover:border-accent/60"
              >
                <Icon name={copied === 'coords' ? 'check' : 'file'} className="size-4" />
                {copied === 'coords' ? 'Copied' : 'Copy Coords'}
              </button>
              <button
                onClick={() => share(turf)}
                aria-label="Share"
                className="grid size-9 place-items-center rounded-full bg-accent text-on-accent hover:bg-accent-soft"
              >
                <Icon name={copied === 'link' ? 'check' : 'link'} className="size-4" />
              </button>
            </div>
          </Popup>
        )}
        <ZoomControl position="bottomleft" />
      </MapContainer>

      {/* Top-left: back + theme */}
      <div className="absolute top-4 left-4 z-[500] flex gap-2">
        <Link to="/" className={`${btnGhost} px-3.5 py-2 shadow-lg`}>
          <Icon name="back" className="size-4" /> Back to hub
        </Link>
        <ThemeToggle className="shadow-lg" />
      </div>

      {/* Right panel: searchable key */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute top-4 right-4 z-[500] w-[calc(100%-2rem)] max-w-72 rounded-2xl border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="" className="size-8 object-contain" />
          <h1 className="font-semibold">The Five Boroughs</h1>
        </div>
        <div className="relative mt-4">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search regions..."
            className="w-full rounded-xl border border-white/10 bg-ink-800 py-2 pr-8 pl-9 text-sm shadow-sm outline-none placeholder:text-zinc-500 focus:border-accent/60"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-zinc-500 hover:text-zinc-100"
            >
              <Icon name="x" className="size-3.5" />
            </button>
          )}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 px-1 text-sm text-zinc-400">
          <Icon name="tag" className="size-4" />
          Labels
          <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="peer sr-only" />
          <span className="relative ml-auto h-5 w-9 rounded-full bg-ink-600 transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
        </label>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 px-1 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={shown}
              onChange={(e) => setShown(e.target.checked)}
              aria-label="Show factions on map"
              className="size-4 cursor-pointer accent-accent"
            />
            <button onClick={() => setOpenList((o) => !o)} className="flex flex-1 items-center gap-2 hover:text-zinc-100">
              <Icon name="layers" className="size-4" />
              Factions
              <span className="rounded-full bg-ink-700 px-1.5 text-xs text-zinc-400">{TURFS.length}</span>
              <Icon name="chevron" className={`ml-auto size-4 transition ${openList ? '' : '-rotate-90'}`} />
            </button>
          </div>
          {openList && (
            <ul className={`mt-2 ml-3 flex max-h-[55dvh] flex-col gap-0.5 overflow-y-auto border-l border-white/10 pl-2 transition ${shown ? '' : 'opacity-40'}`}>
              {list.map((t) => (
                <li key={t.name}>
                  <button
                    onClick={() => open(t)}
                    title={`${t.name} · ${t.area}`}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      t.name === selected ? 'bg-accent text-on-accent shadow-glow' : 'text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="size-3 shrink-0 rounded-[3px] ring-1 ring-black/50" style={{ background: t.color }} />
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    <span className={`shrink-0 text-xs ${t.name === selected ? 'text-on-accent/80' : 'text-zinc-500'}`}>{t.area}</span>
                  </button>
                </li>
              ))}
              {!list.length && <li className="px-2.5 py-2 text-sm text-zinc-500">No regions match "{query}"</li>}
            </ul>
          )}
        </div>
      </motion.aside>

      {/* Full-screen photo viewer */}
      {viewer && photos.length > 0 && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-black/90 p-4 backdrop-blur-sm" onClick={() => setViewer(false)}>
          <div className="flex w-full max-w-6xl items-center justify-between text-white">
            <p className="font-semibold">
              {turf.name} <span className="text-white/50">· {shot + 1} / {photos.length}</span>
            </p>
            <button onClick={() => setViewer(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="x" className="size-5" />
            </button>
          </div>
          <div className="relative flex w-full max-w-6xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={photos[shot]} alt={`${turf.name} photo ${shot + 1}`} className="max-h-[80dvh] w-auto rounded-xl object-contain shadow-2xl" />
            {photos.length > 1 && (
              <>
                <button onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <Icon name="back" className="size-5" />
                </button>
                <button onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <Icon name="back" className="size-5 rotate-180" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}
