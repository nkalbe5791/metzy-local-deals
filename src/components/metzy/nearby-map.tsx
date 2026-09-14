import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = { id: string; name: string; lat: number; lng: number };

const METZ = { lat: 49.1193, lng: 6.1757 };

export default function NearbyMap({
  position,
  markers,
}: {
  position: { lat: number; lng: number } | null;
  markers: MapMarker[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = position ?? METZ;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: position ? 14 : 12,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (position) {
      L.circleMarker([position.lat, position.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: "#e0b64a",
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindPopup("Tu es ici");
      L.circle([position.lat, position.lng], {
        radius: 600,
        color: "#e0b64a",
        weight: 1,
        fillColor: "#e0b64a",
        fillOpacity: 0.08,
      }).addTo(layer);
    }

    for (const m of markers) {
      L.marker([m.lat, m.lng]).addTo(layer).bindPopup(m.name);
    }

    const points: [number, number][] = [
      ...(position ? ([[position.lat, position.lng]] as [number, number][]) : []),
      ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.25));
    } else if (points.length === 1) {
      map.setView(points[0]!, 14);
    }
  }, [position, markers]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Carte des commerces à proximité" />;
}
