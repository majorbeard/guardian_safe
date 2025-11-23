import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  // Get API key from environment (not exposed to client)
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Call Geoapify autocomplete API
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.append('text', text);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('filter', 'countrycode:za'); // South Africa only
    url.searchParams.append('limit', '5');
    url.searchParams.append('type', 'amenity');
    url.searchParams.append('lang', 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data = await response.json();

    // Return results
    return res.status(200).json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({ error: 'Failed to fetch address suggestions' });
  }
}
