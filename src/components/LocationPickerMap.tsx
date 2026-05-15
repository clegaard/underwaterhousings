'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom SVG pin to avoid Next.js asset-resolution issues with Leaflet's default icons
const pinIcon = L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"
              d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 22 8 22S20 13.4 20 8c0-4.4-3.6-8-8-8z"/>
        <circle cx="12" cy="8" r="3.5" fill="white"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
})

// ─── RecenterMap ────────────────────────────────────────────────────────────
// Child component that can imperatively move the map view whenever the
// center/zoom props change (Leaflet's MapContainer center is only for init).
interface RecenterProps { lat: number; lng: number; zoom: number }

function RecenterMap({ lat, lng, zoom }: RecenterProps) {
    const map = useMap()
    const prev = useRef<RecenterProps | null>(null)
    useEffect(() => {
        const p = prev.current
        if (!p || p.lat !== lat || p.lng !== lng || p.zoom !== zoom) {
            map.setView([lat, lng], zoom, { animate: true })
            prev.current = { lat, lng, zoom }
        }
    }, [map, lat, lng, zoom])
    return null
}

// ─── MapClickHandler ─────────────────────────────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
    return null
}

// ─── LocationPickerMap ───────────────────────────────────────────────────────
export interface LocationPickerMapProps {
    markerLat: number | null
    markerLng: number | null
    radius: number          // metres
    centerLat: number
    centerLng: number
    centerZoom: number
    onMapClick: (lat: number, lng: number) => void
}

export default function LocationPickerMap({
    markerLat, markerLng, radius,
    centerLat, centerLng, centerZoom,
    onMapClick,
}: LocationPickerMapProps) {
    return (
        <MapContainer
            center={[centerLat, centerLng]}
            zoom={centerZoom}
            style={{ height: '256px', width: '100%' }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={centerLat} lng={centerLng} zoom={centerZoom} />
            <MapClickHandler onMapClick={onMapClick} />
            {markerLat !== null && markerLng !== null && (
                <>
                    <Marker position={[markerLat, markerLng]} icon={pinIcon} />
                    <Circle
                        center={[markerLat, markerLng]}
                        radius={radius}
                        pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.15,
                            weight: 2,
                        }}
                    />
                </>
            )}
        </MapContainer>
    )
}
