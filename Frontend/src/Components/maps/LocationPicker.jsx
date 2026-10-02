import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  LayersControl,
  useMap,
} from 'react-leaflet';
import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pin } from 'lucide-react';
import L from 'leaflet';

// Create custom red pin icon
const customIcon = L.divIcon({
  html: renderToStaticMarkup(
    <Pin
      size={28}
      strokeWidth={2}
      color="#ef4444"
      fill="#ef4444"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
    />
  ),
  className: 'custom-pin-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function LocationMarker({ onSelect, selectedPosition }) {
  const [position, setPosition] = useState(selectedPosition);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  // Update marker when external position changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (selectedPosition) {
      setPosition(selectedPosition);
    }
  }, [selectedPosition]);

  return position ? <Marker position={position} icon={customIcon} /> : null;
}

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 15);
    }
  }, [center, map]);

  return null;
}

export default function LocationPicker({ onLocationSelect, selectedLocation }) {
  return (
    <MapContainer
      center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [-1.9441, 30.0619]} // Kigali
      zoom={13}
      maxZoom={20}
      className="h-64 w-full rounded-lg"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street Map">
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="© Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <LocationMarker onSelect={onLocationSelect} selectedPosition={selectedLocation} />
      <MapUpdater center={selectedLocation} />
    </MapContainer>
  );
}
