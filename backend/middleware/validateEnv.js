// Startup Environment Validation
export const validateEnv = () => {
  const required = ['MAPBOX_TOKEN', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('CRITICAL: Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  const aiStatus = process.env.ANTHROPIC_API_KEY ? 'Claude' : (process.env.OPENAI_API_KEY ? 'GPT-4o' : 'Offline');
  const cvStatus = process.env.CV_SERVICE_URL ? process.env.CV_SERVICE_URL : 'Disabled (using fallback)';

  console.log('-----------------------------------------');
  console.log('RouteViz Backend Starting...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Auth: Ready (JWT)`);
  console.log(`AI Engine: ${aiStatus}`);
  console.log(`CV Service: ${cvStatus}`);
  console.log('-----------------------------------------');
};
