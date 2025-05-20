const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  description: { type: String }
});

const Location = mongoose.model('Location', locationSchema);

app.get('/', (req, res) => {
  res.send('Leaflet Project Backend');
});


app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/locations', async (req, res) => {
  const location = new Location({
    name: req.body.name,
    lat: req.body.lat,
    lng: req.body.lng,
    description: req.body.description
  });

  try {
    const newLocation = await location.save();
    res.status(201).json(newLocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);
    if (!deletedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        lat: req.body.lat,
        lng: req.body.lng,
        description: req.body.description
      },
      { new: true }
    );
    if (!updatedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json(updatedLocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Seed some initial data if collection is empty
async function seedInitialData() {
  const count = await Location.countDocuments();
  if (count === 0) {
    const initialLocations = [
      { name: 'Central Park', lat: 40.7829, lng: -73.9654, description: 'Iconic urban park in NYC' },
      { name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, description: 'Famous American landmark' },
      { name: 'Times Square', lat: 40.7580, lng: -73.9855, description: 'Busiest commercial intersection' }
    ];
    
    await Location.insertMany(initialLocations);
    console.log('Initial location data seeded');
  }
}

// Call the seed function after connection
mongoose.connection.once('open', () => {
  seedInitialData();
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});