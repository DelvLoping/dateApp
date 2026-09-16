type GeocodingResponse = {
  features?: Array<{ properties?: { label?: string } }>;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 3 || query.length > 180) return Response.json({ addresses: [] });

  try {
    const url = new URL('https://data.geopf.fr/geocodage/search');
    url.searchParams.set('q', query);
    url.searchParams.set('index', 'address');
    url.searchParams.set('limit', '5');
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error('Geocoding unavailable');
    const data = await response.json() as GeocodingResponse;
    const addresses = [...new Set((data.features ?? []).map((feature) => feature.properties?.label).filter((label): label is string => Boolean(label)))];
    return Response.json({ addresses });
  } catch {
    return Response.json({ addresses: [] });
  }
}
