import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius") ?? "10000";

  if (!lat || !lon) {
    return NextResponse.json([]);
  }

  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="clinic"](around:${radius},${lat},${lon});
    );
    out body;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
      next: { revalidate: 60 }, // cache safely
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(data.elements ?? []);
  } catch {
    // ❌ removed unused `error`
    return NextResponse.json([]);
  }
}
