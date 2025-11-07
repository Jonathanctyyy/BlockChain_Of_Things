function validateSensorData(data) {
  if (!data.sensorId || typeof data.sensorId !== 'number') {
    return 'Invalid sensorId';
  }
  if (typeof data.value !== 'number') {
    return 'Invalid value';
  }
  return null;
}

module.exports = { validateSensorData };
