import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const radius = searchParams.get("radius") ?? "15000";

    // Safety check
    if (!lat || !lon) {
      return NextResponse.json([]);
    }

    // Overpass query (hospitals + clinics)
    const query = `
[out:json];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
);
out;
`;

    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      }
    );

    // If Overpass fails, return empty list (never crash frontend)
    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();

    // Overpass returns { elements: [...] }
    return NextResponse.json(data.elements ?? []);
  } catch (error) {
    // Absolute fallback
    return NextResponse.json([]);
  }
}
