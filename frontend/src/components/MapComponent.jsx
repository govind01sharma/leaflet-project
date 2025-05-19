import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function LocationMarker({ selectedLocation, setSelectedLocation }) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (selectedLocation && selectedLocation.lat === lat && selectedLocation.lng === lng) {
        // Deselect if clicking the same location
        setSelectedLocation(null);
      } else {
        // Select new location
        setSelectedLocation({
          lat,
          lng,
          name: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          description: ''
        });
      }
    },
  });

  if (!selectedLocation) return null;

  return (
    <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
      <Popup>
        <h3>{selectedLocation.name}</h3>
        <p>Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
        {selectedLocation.description && <p>{selectedLocation.description}</p>}
      </Popup>
    </Marker>
  );
}

export default function MapComponent() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const position = [51.505, -0.09];

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get('/api/locations');
        setLocations(response.data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, []);

  const handleSaveLocation = async () => {
    if (!selectedLocation) return;
    
    try {
      const response = await axios.post('/api/locations', selectedLocation);
      setLocations([...locations, response.data]);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer 
        center={position} 
        zoom={13} 
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {locations.map(location => (
          <Marker 
            key={location._id || location.id} 
            position={[location.lat, location.lng]}
            eventHandlers={{
              click: () => {
                if (selectedLocation && selectedLocation.lat === location.lat && selectedLocation.lng === location.lng) {
                  setSelectedLocation(null);
                } else {
                  setSelectedLocation(location);
                }
              }
            }}
          >
            <Popup>
              <h3>{location.name}</h3>
              <p>Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              {location.description && <p>{location.description}</p>}
            </Popup>
          </Marker>
        ))}
        <LocationMarker 
          selectedLocation={selectedLocation} 
          setSelectedLocation={setSelectedLocation} 
        />
      </MapContainer>
      
      {selectedLocation && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)'
        }}>
          <h3>Selected Location</h3>
          <p>Latitude: {selectedLocation.lat.toFixed(4)}</p>
          <p>Longitude: {selectedLocation.lng.toFixed(4)}</p>
          <button onClick={handleSaveLocation}>Save Location</button>
          <button onClick={() => setSelectedLocation(null)}>Clear Selection</button>
        </div>
      )}
    </div>
  );
}