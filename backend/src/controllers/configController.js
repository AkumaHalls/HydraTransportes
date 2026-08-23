const Config = require('../models/Config');

exports.get = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    const response = config.toObject();
    response.mapboxToken = process.env.MAPBOX_TOKEN || '';
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
    }
    const update = { ...req.body };
    delete update.mapboxToken;
    delete update._id;
    delete update.createdAt;
    delete update.updatedAt;
    Object.assign(config, update);
    await config.save();
    const response = config.toObject();
    response.mapboxToken = process.env.MAPBOX_TOKEN || '';
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
