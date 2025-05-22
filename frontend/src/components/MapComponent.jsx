import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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
    background: #f1f1f1;
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
      </Popup>
    </Marker>
  );
}

export default function MapComponent() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
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

  useEffect(() => {
    if (selectedLocation) {
      setEditingName(selectedLocation.name || '');
      setEditingDescription(selectedLocation.description || '');
    }
  }, [selectedLocation]);

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
    } catch (error) {
      console.error('Error deleting location:', error);
    }
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
              mouseover: (e) => {
                e.target.openPopup();
              },
              mouseout: (e) => {
                e.target.closePopup();
              },
              click: () => {
                if (selectedLocation && selectedLocation._id === location._id) {
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
    </div>
  );
}