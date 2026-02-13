const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  
  if (!url) {
    console.log('Keep-alive disabled: No URL configured');
    return;
  }

  setInterval(async () => {
    try {
      const response = await fetch(`${url}/health`);
      console.log(`Keep-alive ping: ${response.status}`);
    } catch (err) {
      console.error('Keep-alive ping failed:', err.message);
    }
  }, 30 * 1000); // Every 30 seconds

  console.log('Keep-alive service started (30s interval)');
};

module.exports = { keepAlive };