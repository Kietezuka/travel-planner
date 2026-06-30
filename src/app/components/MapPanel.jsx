"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState, useMemo } from "react";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"
import { CATEGORY_MAP } from "../constants/categories";

const DEFAULT_CENTER = [20, 0];


// Teardrop map-pin: circular head (center 18,18) tapering to a point at (18,48)
const PIN_PATH = "M18 0C8.1 0 0 8.1 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.1 27.9 0 18 0z";
// White hotel/bed glyph shown inside accommodation pins
const HOTEL_PATH = "M40-200v-600h80v400h320v-320h320q66 0 113 47t47 113v360h-80v-120H120v120H40Zm155-275q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm325 75h320v-160q0-33-23.5-56.5T760-640H520v240ZM308.5-531.5Q320-543 320-560t-11.5-28.5Q297-600 280-600t-28.5 11.5Q240-577 240-560t11.5 28.5Q263-520 280-520t28.5-11.5ZM280-560Zm240-80v240-240Z";

const getPinIcon = (marker, activeId, focusedId) => {
    const isFocused = marker.id === activeId || marker.id === focusedId;

    let pinColor;
    let inner;
    if (marker.type === 'accommodation') {
        pinColor = CATEGORY_MAP.accommodation?.color || '#EA9698';
        inner = `<span class="map-pin__label"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="${HOTEL_PATH}"/></svg></span>`;
    } else {
        const categoryData = CATEGORY_MAP[marker.category];
        pinColor = categoryData ? categoryData.color : '#1d12f3';
        inner = marker.order ? `<span class="map-pin__label">${marker.order}</span>` : '';
    }

    return L.divIcon({
        className: "activity-div-icon",
        html: `
        <div class="map-pin${isFocused ? ' is-focused' : ''}">
            <svg class="map-pin__body" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
                <path d="${PIN_PATH}" fill="${pinColor}" stroke="#fff" stroke-width="1.5"/>
            </svg>
            ${inner}
        </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -44]
    });
};

function MapViewUpdater({ markers, focusedId }) {
    const map = useMap();

    useEffect(() => {
        if(focusedId){
            const focusedMarker = markers.find(m => m.id === focusedId);
            if(focusedMarker){
                map.flyTo([focusedMarker.position.lat, focusedMarker.position.lng], 14, {
                    duration: 1.5
                });
            }
        }
    }, [ focusedId, markers, map]);
    return null;
}

function InitialView({ center, destinationCenter, hasMarkers }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (destinationCenter && !hasMarkers) {
            map.setView(destinationCenter, 13);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destinationCenter]);
    return null;
}

export default function MapPanel({ markers = [], activeId, focusedId, destination }) {
    const [destinationCenter, setDestinationCenter] = useState(null);

    useEffect(() => {
        if (!destination) return;
        let cancelled = false;
        fetch(`/api/geocode?q=${encodeURIComponent(destination)}&type=destination`)
            .then(res => res.json())
            .then(data => {
                if (!cancelled && Array.isArray(data) && data[0]) {
                    setDestinationCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [destination]);

    const center = useMemo(() => {
        if (markers && markers.length > 0) {
            return [markers[0].position.lat, markers[0].position.lng];
        }
        return destinationCenter || DEFAULT_CENTER;
    }, [markers, destinationCenter]);

    return (
            <MapContainer
                center={center}
                zoom={13}
                style={{height: "100%", width: "100%", minHeight: "400px"}}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <InitialView center={center} destinationCenter={destinationCenter} hasMarkers={markers && markers.length > 0} />
                <MapViewUpdater markers={markers} focusedId={focusedId}/>
                {markers.map((marker) => {
                    return(
                        <Marker
                            key={`${marker.type}-${marker.id}`}
                            position={[marker.position.lat, marker.position.lng]}
                            icon={getPinIcon(marker, activeId, focusedId)}
                        >
                            <Popup>
                                <strong>
                                    {marker.type === 'accommodation' ? "🏨 " : marker.order ? `${marker.order}. ` : "📍 "}
                                    {marker.title}
                                </strong>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
    );
}
