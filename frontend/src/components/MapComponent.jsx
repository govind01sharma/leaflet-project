import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const styles = `
  .button {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s ease, filter 0.1s ease;
  }

  .button:active {
    transform: scale(0.98);
    filter: brightness(0.95);
  }

  .button-primary {
    background: #4CAF50;
    color: white;
  }

  .button-danger {
    background: #f44336;
    color: white;
  }

  .button-secondary {
    background: #add8e6;
  }

  .mini-map-container {
    height: 200px;
    width: 200px;
    margin-top: 10px;
  }
  
  .mini-map {
    height: 100%;
    width: 100%;
    pointer-events: none;
  }

  .connection-panel {
    position: absolute;
    bottom: 10px;
    left: 10px;
    z-index: 1000;
    background: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    width: 300px;
  }
`;

const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MiniMap({ lat, lng }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  return (
    <div className="mini-map-container">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        className="mini-map"
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}

function LocationMarker({ selectedLocation, setSelectedLocation }) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (selectedLocation && selectedLocation.lat === lat && selectedLocation.lng === lng) {
        setSelectedLocation(null);
      } else {
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
    <Marker 
      position={[selectedLocation.lat, selectedLocation.lng]}
      eventHandlers={{
        mouseover: (e) => {
          e.target.openPopup();
        },
        mouseout: (e) => {
          e.target.closePopup();
        }
      }}
    >
      <Popup>
        <h3>{selectedLocation.name}</h3>
        <p>Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
        {selectedLocation.description && <p>{selectedLocation.description}</p>}
        <MiniMap lat={selectedLocation.lat} lng={selectedLocation.lng} />
      </Popup>
    </Marker>
  );
}

export default function MapComponent() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

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

  useEffect(() => {
    if (selectedLocation) {
      setEditingName(selectedLocation.name || '');
      setEditingDescription(selectedLocation.description || '');
    }
  }, [selectedLocation]);

  const handleMarkerClick = (location) => {
    if (!startPoint) {
      setStartPoint(location);
    } else if (!endPoint && location._id !== startPoint._id) {
      setEndPoint(location);
    } else {
      setStartPoint(location);
      setEndPoint(null);
    }

    if (selectedLocation && selectedLocation._id === location._id) {
      setSelectedLocation(null);
    } else {
      setSelectedLocation(location);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedLocation) return;
    
    const locationToSave = {
      ...selectedLocation,
      name: editingName,
      description: editingDescription
    };
    
    try {
      const response = await axios.post('/api/locations', locationToSave);
      setLocations([...locations, response.data]);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedLocation || !selectedLocation._id) return;
    
    const updatedLocation = {
      name: editingName,
      description: editingDescription,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    };
    
    try {
      const response = await axios.put(`/api/locations/${selectedLocation._id}`, updatedLocation);
      setLocations(locations.map(loc => 
        loc._id === selectedLocation._id ? response.data : loc
      ));
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await axios.delete(`/api/locations/${id}`);
      setLocations(locations.filter(location => location._id !== id));
      if (selectedLocation && selectedLocation._id === id) {
        setSelectedLocation(null);
      }
      if (startPoint && startPoint._id === id) {
        setStartPoint(null);
      }
      if (endPoint && endPoint._id === id) {
        setEndPoint(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 0;
    
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer 
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {locations.map(location => (
          <Marker 
            key={location._id} 
            position={[location.lat, location.lng]}
            eventHandlers={{
              mouseover: (e) => e.target.openPopup(),
              mouseout: (e) => e.target.closePopup(),
              click: () => handleMarkerClick(location)
            }}
          >
            <Popup>
              <h3>{location.name}</h3>
              <p>Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              {location.description && <p>{location.description}</p>}
              <MiniMap lat={location.lat} lng={location.lng} />
            </Popup>
          </Marker>
        ))}
        
        {startPoint && endPoint && (
          <Polyline 
            positions={[
              [startPoint.lat, startPoint.lng],
              [endPoint.lat, endPoint.lng]
            ]}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
        
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
          padding: '20px',
          borderRadius: '5px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          width: '300px'
        }}>
          <h3>{selectedLocation._id ? 'Edit Location' : 'New Location'}</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="location-name" style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
            <input
              type="text"
              id="location-name"
              name="name"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              aria-label="Location name"
              autoComplete="off"
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="location-description" style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
            <textarea
              id="location-description"
              name="description"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              style={{ width: '100%', padding: '8px', minHeight: '80px' }}
              aria-label="Location description"
              autoComplete="off"
            />
          </div>
          
          <p>Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            {selectedLocation._id ? (
              <>
                <button 
                  onClick={handleUpdateLocation}
                  className="button button-primary"
                  aria-label="Update location"
                >
                  Update
                </button>
                <button 
                  onClick={() => handleDeleteLocation(selectedLocation._id)}
                  className="button button-danger"
                  aria-label="Delete location"
                >
                  Delete
                </button>
              </>
            ) : (
              <button 
                onClick={handleSaveLocation}
                className="button button-primary"
                aria-label="Save location"
              >
                Save Location
              </button>
            )}
            <button 
              onClick={() => setSelectedLocation(null)}
              className="button button-secondary"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {startPoint && (
        <div className="connection-panel">
          <h4>Connection</h4>
          <p>From: {startPoint.name}</p>
          {endPoint ? (
            <>
              <p>To: {endPoint.name}</p>
              <p>Distance: {calculateDistance(startPoint, endPoint).toFixed(2)} km</p>
            </>
          ) : (
            <p>Click another marker to set destination</p>
          )}
          <button 
            onClick={() => {
              setStartPoint(null);
              setEndPoint(null);
            }}
            className="button button-secondary"
            style={{ marginTop: '10px' }}
          >
            Clear Connection
          </button>
        </div>
      )}
    </div>
  );
}