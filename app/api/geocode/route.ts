import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city");
  if (!city) return NextResponse.json(null);

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      city
    )}&limit=1`
  );

  const data = await res.json();
  return NextResponse.json(data[0] ?? null);
}
