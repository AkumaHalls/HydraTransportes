require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const app = express();

const MONGO_URI = process.env.MONGODB_URI.replace('/?', '/hydra_transportes?');
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try { await require('./src/config/db').createCollections(); } catch (e) { /* collections may already exist */ }
  })
  .catch(err => console.error('MongoDB error:', err));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/config', require('./src/routes/config'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/drivers', require('./src/routes/drivers'));
app.use('/api/corridas', require('./src/routes/corridas'));
app.use('/api/export', require('./src/routes/export'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
