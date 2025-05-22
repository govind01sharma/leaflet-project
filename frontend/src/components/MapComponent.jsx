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
      ...selectedLocation,
      name: editingName,
      description: editingDescription
    };
    
    try {
      const response = await axios.put(`/api/locations/${selectedLocation._id}`, updatedLocation);
      setLocations(locations.map(loc => 
        loc._id === selectedLocation._id ? response.data : loc
      ));
      setSelectedLocation(response.data);
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
            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
            <textarea
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              style={{ width: '100%', padding: '8px', minHeight: '80px' }}
            />
          </div>
          
          <p>Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            {selectedLocation._id ? (
              <>
                <button 
                  onClick={handleUpdateLocation}
                  style={{ padding: '8px 15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Update
                </button>
                <button 
                  onClick={() => handleDeleteLocation(selectedLocation._id)}
                  style={{ padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Delete
                </button>
              </>
            ) : (
              <button 
                onClick={handleSaveLocation}
                style={{ padding: '8px 15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Save Location
              </button>
            )}
            <button 
              onClick={() => setSelectedLocation(null)}
              style={{ padding: '8px 15px', background: '#f1f1f1', border: 'none', borderRadius: '4px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}