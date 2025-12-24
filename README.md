<h1 align="center" id="title">Hospital Finder</h1>

<p align="center"><img src="https://socialify.git.ci/ArhammJain/Hospital-Finder/image?custom_language=Next.js&font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Solid&stargazers=1&theme=Dark" alt="Hospital-Finder" width="640" height="320" /></p>

<p id="description">A fast, modern, and intuitive web application for finding nearby hospitals and clinics. Built with Next.js and powered by OpenStreetMap data via Overpass API, Hospital Finder helps users locate healthcare facilities in any city with real-time map visualization and detailed information.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Leaflet-1.9-green?style=for-the-badge&logo=leaflet">
  <img src="https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white">
  <img src="https://img.shields.io/badge/OpenStreetMap-API-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white">
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge">
</p>

<h2>🚀 Demo</h2>

[Hospital Finder By Arham](hospitalfinderbyarham.vercel.app)

<h2>✨ Key Features</h2>

Here are some of the project's best features:

*   **Smart City Search** - Find any city worldwide using intelligent geocoding
*   **Real time Hospital Discovery** - Instant search for nearby hospitals and clinics using Overpass API
*   **Interactive Map View** - Beautiful Leaflet-powered maps with custom markers
*   **Adaptive Search Radius** - Automatically adjusts search area based on city size
*   **Detailed Facility Information** - View hospital names, addresses, and amenities
*   **One Click Directions** - Get Google Maps directions to any facility
*   **Responsive Design** - Seamless experience on desktop, tablet, and mobile devices
*   **Mobile Bottom Sheet** - Swipeable interface for easy navigation on mobile
*   **Multiple Geocoding Fallbacks** - Reliable location search with backup services
*   **Zero Configuration** - No API keys required, uses free OpenStreetMap services

<h2>🛠️ Installation Steps</h2>

<p>1. Clone the Repository</p>

```bash
git clone https://github.com/your-username/hospital-finder.git
cd hospital-finder
```

<p>2. Install Dependencies</p>

```bash
npm install
# or
yarn install
# or
pnpm install
```

<p>3. Set Up Environment Variables (Optional)</p>

Create a `.env.local` file in the root directory:

```env
# Optional: Add custom configuration
NEXT_PUBLIC_DEFAULT_LAT=20.5937
NEXT_PUBLIC_DEFAULT_LON=78.9629
```

> **Note:** No API keys are required! The app uses free public APIs (Nominatim for geocoding and Overpass for hospital data).

<p>4. Run the Development Server</p>

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

<h2>🏗️ Project Structure</h2>

```
hospital-finder/
├── app/
│   ├── api/
│   │   └── geocode/
│   │       └── route.ts          # Geocoding API endpoint
│   ├── page.tsx                   # Main application page
│   └── layout.tsx                 # Root layout
├── components/
│   ├── SearchBar.tsx              # City search input
│   ├── PlacesList.tsx             # Hospital list view
│   └── MapView.tsx                # Interactive map component
├── types/
│   └── place.ts                   # TypeScript type definitions
└── public/
    └── ...                        # Static assets
```

<h2>🔧 Technologies Used</h2>

**Frontend:**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Leaflet** - Interactive maps
- **React Leaflet** - React bindings for Leaflet
- **Lucide React** - Beautiful icons

**APIs & Services:**
- **Nominatim API** - Geocoding (city to coordinates)
- **Photon API** - Fallback geocoding service
- **Overpass API** - OpenStreetMap data query
- **OpenStreetMap** - Map tiles and healthcare data

**Deployment:**
- **Vercel** - Hosting and deployment platform

<h2>🌐 API Endpoints</h2>

### GET `/api/geocode`

Geocodes a city name to coordinates.

**Query Parameters:**
- `city` (required) - City name to search

**Response:**
```json
{
  "lat": "51.5074",
  "lon": "-0.1278",
  "display_name": "London, Greater London, England, United Kingdom",
  "boundingbox": ["51.28", "51.69", "-0.51", "0.33"]
}
```

<h2>🎨 Features in Detail</h2>

### Smart Search Algorithm
- Automatically calculates optimal search radius based on city size
- Multiple retry attempts with increasing radius
- Supports both hospitals and clinics
- Handles node and way geometries from OSM

### Responsive UI
- **Desktop:** Sidebar layout with map on the right
- **Mobile:** Bottom sheet interface with swipe gestures
- **Tablet:** Adaptive layout that works seamlessly

### Map Features
- Custom hospital markers with selection highlighting
- Auto-center on search results
- Zoom controls and full-screen map option
- Marker clustering for dense areas (optional)

<h2>🚦 Usage</h2>

1. **Search for a City**
   - Enter any city name in the search bar
   - Press Enter or click the search button

2. **Browse Results**
   - View the list of hospitals and clinics
   - Scroll through the results on mobile using the bottom sheet

3. **View on Map**
   - Click any hospital to highlight it on the map
   - The map will automatically center on the selected location

4. **Get Directions**
   - Click the navigation button next to any hospital
   - Opens Google Maps with directions

<h2>🐛 Known Issues & Troubleshooting</h2>

**"Geocoding failed: 500"**
- Solution: The geocode API needs a User-Agent header. Update `/app/api/geocode/route.ts` with the provided fixed version.

**"No hospitals found"**
- Some remote areas may not have hospital data in OpenStreetMap
- Try searching for a larger nearby city
- The app will automatically try larger search radii

**Map not loading**
- Check your internet connection
- Verify that OpenStreetMap tiles are not blocked by firewall/VPN

<h2>🤝 Contributing</h2>

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<h2>📝 License</h2>

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<h2>🙏 Acknowledgments</h2>

- **OpenStreetMap** - For providing free, open healthcare facility data
- **Nominatim** - For free geocoding services
- **Overpass API** - For powerful OSM data queries
- **Leaflet** - For the excellent mapping library
- **Vercel** - For seamless deployment

<h2>👨‍💻 Author</h2>

**Your Name**
- GitHub: [@ArhammJain](https://github.com/ArhammJain)
- Instagram: [arham.builds](https:///instagram.com/arham.builds)

<h2>⭐ Star History</h2>

If you find this project useful, please consider giving it a star! ⭐

---

<p align="center">Follow @arham.builds on Instagram</p>
