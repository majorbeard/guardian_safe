import L from "leaflet";

// Fix Leaflet default marker icons (they break in bundlers)
export const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

// Create custom colored markers
export const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        border: 2px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 5px;
          left: 5px;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Create arrow marker for moving vehicle
export const createArrowIcon = (color: string, rotation: number = 0) => {
  return L.divIcon({
    className: "custom-arrow-icon",
    html: `
      <div style="
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-bottom: 20px solid ${color};
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
        transform: rotate(${rotation}deg);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 20],
  });
};

// Initialize OpenStreetMap tile layer
export const getOpenStreetMapLayer = () => {
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });
};

// Alternative: Satellite imagery (if you want satellite view option)
export const getSatelliteLayer = () => {
  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "© Esri, Maxar, Earthstar Geographics",
      maxZoom: 19,
    }
  );
};
