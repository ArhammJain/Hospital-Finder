import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const city = new URL(req.url).searchParams.get("city");
    
    if (!city) {
      return NextResponse.json(
        { error: "City parameter is required" },
        { status: 400 }
      );
    }

    console.log(`🌍 Geocoding city: ${city}`);

    // Add User-Agent header (Nominatim requires it)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        city
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "HospitalFinderApp/1.0",
        },
      }
    );

    console.log(`📡 Nominatim status: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Nominatim error: ${response.status}`);
      return NextResponse.json(
        { error: `Geocoding service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log(`📊 Results: ${data.length}`);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 }
      );
    }

    const result = data[0];
    console.log(`✅ Found: ${result.display_name}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("💥 Geocoding error:", error);
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}