import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPinOff } from 'lucide-react';

/**
 * Mapa simples com a posição do entregador e o destino.
 * Carrega a API do Google Maps sob demanda, uma única vez por página.
 */

interface LiveDeliveryMapProps {
  driver: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  className?: string;
}

declare global {
  interface Window {
    __lovableInitDeliveryMap?: () => void;
  }
}

const BROWSER_KEY = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as string | undefined;
const TRACKING_ID = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] as string | undefined;

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error('mapa não configurado'));

  mapsPromise = new Promise<void>((resolve, reject) => {
    window.__lovableInitDeliveryMap = () => resolve();

    const script = document.createElement('script');
    const channel = TRACKING_ID ? `&channel=${encodeURIComponent(TRACKING_ID)}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__lovableInitDeliveryMap${channel}`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('falha ao carregar o mapa'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function LiveDeliveryMap({ driver, destination, className }: LiveDeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error('Mapa de entrega indisponível:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const center = driver ?? destination ?? { lat: -23.55, lng: -46.63 };

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: 15,
        clickableIcons: false,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });
    }

    const map = mapRef.current;

    if (destination) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = new window.google.maps.Marker({
          map,
          position: destination,
          title: 'Endereço de entrega',
        });
      } else {
        destMarkerRef.current.setPosition(destination);
      }
    }

    if (driver) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          map,
          position: driver,
          title: 'Entregador',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
      } else {
        driverMarkerRef.current.setPosition(driver);
      }
    }

    if (driver && destination) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(driver);
      bounds.extend(destination);
      map.fitBounds(bounds, 60);
    } else if (driver || destination) {
      map.setCenter(center);
    }
  }, [ready, driver, destination]);

  useEffect(
    () => () => {
      driverMarkerRef.current?.setMap(null);
      destMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      destMarkerRef.current = null;
      mapRef.current = null;
    },
    [],
  );

  if (failed || !BROWSER_KEY) {
    return (
      <div className={`flex h-56 flex-col items-center justify-center gap-2 rounded-lg bg-secondary/40 text-muted-foreground ${className ?? ''}`}>
        <MapPinOff className="h-6 w-6" />
        <p className="text-sm">Mapa indisponível no momento</p>
      </div>
    );
  }

  return (
    <div className={`relative h-56 overflow-hidden rounded-lg bg-secondary/40 ${className ?? ''}`}>
      <div ref={containerRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
