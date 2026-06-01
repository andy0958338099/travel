"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { ALL_ATTRACTIONS, Attraction } from "./data";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons by category
const createIcon = (color: string, emoji: string = "") => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    ">${emoji ? `<span style="font-size:10px">${emoji}</span>` : `<div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>`}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

const icons = {
  westLake: createIcon("#10b981", "🌊"),
  wuzhen: createIcon("#f59e0b", "🏘"),
  other: createIcon("#3b82f6", "🎯"),
};

// Fly to location component
function FlyTo({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  map.flyTo(position, zoom, { duration: 1.5 });
  return null;
}

interface AttractionsMapProps {
  selectedDay?: string;
  plannedAttractions?: string[];
}

export default function AttractionsMap({ selectedDay: _selectedDay, plannedAttractions = [] }: AttractionsMapProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'westLake' | 'wuzhen' | 'other'>('all');
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.25, 120.15]);
  const [mapZoom, setMapZoom] = useState(11);

  const filteredAttractions = activeFilter === 'all'
    ? ALL_ATTRACTIONS  // show ALL markers — planned ones get additional red markers below
    : ALL_ATTRACTIONS.filter(a => a.category === activeFilter);

  const handleMarkerClick = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    setMapCenter([attraction.lat, attraction.lng]);
    setMapZoom(14);
  };

  const categoryLabels = {
    westLake: { label: "西湖景區", color: "#10b981", emoji: "🌊" },
    wuzhen: { label: "烏鎮水鄉", color: "#f59e0b", emoji: "🏘️" },
    other: { label: "其他景點", color: "#3b82f6", emoji: "🎯" },
  };

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📍 全部景點 ({ALL_ATTRACTIONS.length})
        </button>
        {Object.entries(categoryLabels).map(([key, { label, color, emoji }]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as 'westLake' | 'wuzhen' | 'other')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
              activeFilter === key
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={activeFilter === key ? { backgroundColor: color } : undefined}
          >
            {emoji} {label} ({ALL_ATTRACTIONS.filter(a => a.category === key).length})
          </button>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 h-[400px] sm:h-[500px]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Center on planned route */}
          {(() => {
            const unique = Array.from(new Set(plannedAttractions));
            if (unique.length > 0) {
              const lats = unique.map(n => { const a = ALL_ATTRACTIONS.find(x => x.name === n); return a?.lat ?? 0; }).filter(Boolean);
              const lngs = unique.map(n => { const a = ALL_ATTRACTIONS.find(x => x.name === n); return a?.lng ?? 0; }).filter(Boolean);
              if (lats.length > 0) {
                const avgLat = lats.reduce((s, v) => s + v, 0) / lats.length;
                const avgLng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
                return <FlyTo position={[avgLat, avgLng]} zoom={10} />;
              }
            }
            return null;
          })()}
          
          {/* Fly to selected location */}
          {selectedAttraction && (
            <FlyTo position={[selectedAttraction.lat, selectedAttraction.lng]} zoom={14} />
          )}
          
          {/* Markers */}
          {filteredAttractions.map((attraction) => (
            <Marker
              key={attraction.name}
              position={[attraction.lat, attraction.lng]}
              icon={icons[attraction.category]}
              eventHandlers={{
                click: () => handleMarkerClick(attraction),
              }}
            >
              <Popup className="custom-popup">
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-base mb-1">{attraction.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>🎫 {attraction.ticket}</p>
                    <p>⏰ {attraction.hours}</p>
                    <p className="text-gray-500 mt-2">{attraction.highlight}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {/* Planned route polyline — deduplicated */}
          {(() => {
            const unique = Array.from(new Set(plannedAttractions));
            const positions = unique.map(name => {
              const attr = ALL_ATTRACTIONS.find(a => a.name === name);
              return attr ? [attr.lat, attr.lng] as [number, number] : null;
            }).filter(Boolean) as [number, number][];
            return positions.length > 1 ? (
              <Polyline
                positions={positions}
                pathOptions={{
                  color: '#ef4444',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '10, 10'
                }}
              />
            ) : null;
          })()}

          {/* Planned attraction markers (highlighted) — deduplicate by name */}
          {Array.from(new Set(plannedAttractions)).map((name, idx) => {
            const attraction = ALL_ATTRACTIONS.find(a => a.name === name);
            if (!attraction) return null;
            return (
              <Marker
                key={`planned-${name}-${idx}`}
                position={[attraction.lat, attraction.lng]}
                icon={L.divIcon({
                  className: "planned-marker",
                  html: `<div style="
                    background-color: #ef4444;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(239,68,68,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                  ">
                    <span style="color: white; font-weight: bold;">${idx + 1}</span>
                  </div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
                eventHandlers={{
                  click: () => handleMarkerClick(attraction),
                }}
              >
                <Popup className="custom-popup">
                  <div className="min-w-[200px]">
                    <p className="text-xs text-red-500 font-medium mb-1">📍 已規劃景點</p>
                    <h3 className="font-bold text-base mb-1">{attraction.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>🎫 {attraction.ticket}</p>
                      <p>⏰ {attraction.hours}</p>
                      <p className="text-gray-500 mt-2">{attraction.highlight}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Selected attraction info card */}
        {selectedAttraction && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: selectedAttraction.category === 'westLake' ? '#10b981' : selectedAttraction.category === 'wuzhen' ? '#f59e0b' : '#3b82f6' }}
                >
                  {categoryLabels[selectedAttraction.category].label}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedAttraction.name}</h3>
              </div>
              <button
                onClick={() => setSelectedAttraction(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span>🎫 {selectedAttraction.ticket}</span>
              <span>⏰ {selectedAttraction.hours}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{selectedAttraction.highlight}</p>
          </div>
        )}
      </div>

      {/* 2-column layout: Planned attractions (left) + Other attractions (right) */}
      {(() => {
        const unique = Array.from(new Set(plannedAttractions));
        const planned = unique.map((name, idx) => {
          const attr = ALL_ATTRACTIONS.find(a => a.name === name);
          return attr ? { ...attr, order: idx + 1 } : null;
        }).filter(Boolean) as (Attraction & { order: number })[];

        const plannedNames = new Set(plannedAttractions);
        const unplanned = ALL_ATTRACTIONS.filter(a => !plannedNames.has(a.name));

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Planned attractions in order */}
            {planned.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                  🔴 已規劃景點（{planned.length}個）
                </h3>
                <div className="space-y-2">
                  {planned.map((attr) => (
                    <button
                      key={attr.name}
                      onClick={() => handleMarkerClick(attr)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-md flex items-center gap-3 ${
                        selectedAttraction?.name === attr.name
                          ? 'border-red-400 bg-red-100'
                          : 'border-red-200 bg-white hover:border-red-300'
                      }`}
                    >
                      {/* Number badge */}
                      <span className="w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {attr.order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800 truncate">{attr.name}</div>
                        <div className="text-xs text-gray-500">{attr.hours}</div>
                      </div>
                      <span className="text-red-600 font-bold text-sm whitespace-nowrap">{attr.ticket}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Right: Other attractions */}
            {unplanned.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-bold text-gray-600 mb-3 flex items-center gap-2">
                  ⚪ 其他景點（{unplanned.length}個）
                </h3>
                <div className="space-y-2">
                  {unplanned.map((attr) => {
                    const catColor = attr.category === 'westLake' ? '#10b981' : attr.category === 'wuzhen' ? '#f59e0b' : '#3b82f6';
                    const catLabel = attr.category === 'westLake' ? '🌊西湖' : attr.category === 'wuzhen' ? '🏘烏鎮' : '🎯其他';
                    return (
                      <button
                        key={attr.name}
                        onClick={() => handleMarkerClick(attr)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-md flex items-center gap-3 ${
                          selectedAttraction?.name === attr.name
                            ? 'border-teal-400 bg-teal-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-800 truncate">{attr.name}</div>
                          <div className="text-xs text-gray-400">{catLabel} · {attr.hours}</div>
                        </div>
                        <span className="text-gray-600 font-bold text-sm whitespace-nowrap">{attr.ticket}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <style jsx global>{`
        .planned-marker {
          background: transparent;
          border: none;
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
        .planned-marker { z-index: 900 !important; }
        .custom-marker { z-index: 400; }
        .leaflet-marker-icon { transition: transform 0.2s; }
        .planned-marker:hover .leaflet-marker-icon { transform: scale(1.2); }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `}</style>
    </div>
  );
}
