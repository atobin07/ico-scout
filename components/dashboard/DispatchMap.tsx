'use client';

import { useEffect, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface MapTech {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
}

const STATUS_COLOR: Record<string, string> = {
  available: '#00D97E',
  en_route: '#F5A623',
  on_job: '#1B54E8',
  offline: '#3A5A7A',
};

export function DispatchMap({ technicians }: { technicians: MapTech[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    let cleanup = () => {};

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (!ref.current) return;
      mapboxgl.accessToken = token;

      const withCoords = technicians.filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng));
      const center: [number, number] = withCoords.length
        ? [withCoords[0].lng, withCoords[0].lat]
        : [-97.7431, 30.2672]; // Austin default

      const map = new mapboxgl.Map({
        container: ref.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom: withCoords.length ? 10 : 9,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      const bounds = new mapboxgl.LngLatBounds();
      withCoords.forEach((t) => {
        const el = document.createElement('div');
        const color = STATUS_COLOR[t.status] ?? '#7A9ABE';
        el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33,0 0 10px ${color};border:2px solid #0C1525;cursor:pointer`;
        new mapboxgl.Marker(el)
          .setLngLat([t.lng, t.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
              `<div style="font-family:Inter,sans-serif;color:#0C1525"><b>${t.name}</b><br><span style="text-transform:capitalize">${t.status.replace('_', ' ')}</span></div>`,
            ),
          )
          .addTo(map);
        bounds.extend([t.lng, t.lat]);
      });
      if (withCoords.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 12 });

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="grid h-full min-h-[420px] place-items-center rounded-xl border border-dashed border-border-2 bg-navy/50 text-center">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink-3">Map unavailable</div>
          <p className="mt-2 text-sm text-ink-2">
            Set <code className="font-mono text-sky">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the live dispatch map.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={ref} className="h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border" />;
}
