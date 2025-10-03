import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [30.8406, -29.8533], // University of KwaZulu-Natal coordinates
      zoom: 15,
    });

    // Add marker for AIIKS location
    new mapboxgl.Marker({
      color: '#E5762A' // Primary color
    })
    .setLngLat([30.8406, -29.8533])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(
          '<div class="p-3">' +
          '<h3 class="font-bold text-primary">AIIKS</h3>' +
          '<p class="text-sm">University of KwaZulu-Natal<br>South Africa</p>' +
          '</div>'
        )
    )
    .addTo(map.current);

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, isTokenSet]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
    }
  };

  if (!isTokenSet) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
        <MapPin className="w-12 h-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Location Map</h3>
        <p className="text-muted-foreground text-center mb-4">
          Enter your Mapbox public token to view the AIIKS location map.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Get your token at: <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
        </p>
        <div className="flex gap-2 w-full max-w-md">
          <Input
            type="text"
            placeholder="Enter Mapbox public token"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTokenSubmit()}
          />
          <Button onClick={handleTokenSubmit}>
            Load Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-card">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
        <h4 className="font-semibold text-primary">AIIKS Location</h4>
        <p className="text-sm text-muted-foreground">University of KwaZulu-Natal</p>
        <p className="text-sm text-muted-foreground">South Africa</p>
      </div>
    </div>
  );
};

export default Map;