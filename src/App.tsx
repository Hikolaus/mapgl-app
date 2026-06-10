import { useEffect, useMemo, useRef } from "react";
import { load } from "@2gis/mapgl";
import type { Map as MapglMap, Label as MapglLabel } from "@2gis/mapgl/types";
import type {
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
} from "geojson";

import dtpDataRaw from "./data/data.json?raw";
import "./App.css";

const KALUGA_CENTER: [number, number] = [36.2754, 54.5293];
const STYLE_ID = "7518472d-ce2e-4b9d-934a-59398b587f78";
const API_KEY = "2b8f7ef1-d311-4017-a6a3-5a59b645ec60";

const HEATMAP_LAYER_ID = "kaluga-dtp-heatmap";
const LABEL_BACKGROUND_IMAGE = "/label-bg.svg";

function createDtpLabels(
  mapgl: Awaited<ReturnType<typeof load>>,
  map: MapglMap,
  points: FeatureCollection<Point, GeoJsonProperties>,
): MapglLabel[] {
  return points.features
    .slice(0, 100)
    .map((feature) => {
      const category = feature.properties?.category || "ДТП";

      if (typeof category !== "string" || category.length === 0) {
        return null;
      }

      return new mapgl.Label(map, {
        coordinates: feature.geometry.coordinates as [number, number],
        text: category,
        image: {
          url: LABEL_BACKGROUND_IMAGE,
          size: [160, 24],
          stretchX: [[8, 152]],
          stretchY: [[8, 16]],
          padding: [4, 8, 4, 8],
        },
        minZoom: 14,
        color: "#000000",
        fontSize: 11,
        offset: [0, -15],
        relativeAnchor: [0.5, 1],
        zIndex: 100,
      });
    })
    .filter((label): label is MapglLabel => label !== null);
}

function addDtpLayers(map: MapglMap) {
  if (!map.hasLayer(HEATMAP_LAYER_ID)) {
    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: "heatmap",
      filter: ["match", ["geometryType"], ["Point"], true, false],
      style: {
        color: [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0, 0, 0, 0)",
          0.25,
          "rgba(66, 153, 225, 0.55)",
          0.45,
          "rgba(56, 178, 172, 0.75)",
          0.65,
          "rgba(246, 173, 85, 0.9)",
          0.85,
          "rgba(229, 62, 62, 0.95)",
          1,
          "rgba(255, 255, 255, 1)",
        ],
        radius: ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 28, 16, 44],
        intensity: 0.9,
        opacity: 0.8,
        downscale: 1,
      },
    });
  }
}

export default function App() {
  const mapRef = useRef<MapglMap | null>(null);

  const dtpPoints = useMemo(() => {
    try {
      return JSON.parse(dtpDataRaw) as FeatureCollection<
        Point,
        GeoJsonProperties
      >;
    } catch (error) {
      console.error("Ошибка парсинга GeoJSON", error);
      return {
        type: "FeatureCollection",
        features: [],
      } as unknown as FeatureCollection<Point, GeoJsonProperties>;
    }
  }, []);

  useEffect(() => {
    let destroyed = false;
    let map: MapglMap | null = null;
    let labels: MapglLabel[] = [];

    load().then((mapgl) => {
      if (destroyed) return;

      // Инициализация карты
      map = new mapgl.Map("map-container", {
        center: KALUGA_CENTER,
        zoom: 12,
        pitch: 25,
        rotation: -15,
        key: API_KEY,
        style: STYLE_ID,
        trafficControl: false,
        trafficOn: false,
        enableTrackResize: true,
      });

      mapRef.current = map;

      new mapgl.GeoJsonSource(map, {
        data: dtpPoints,
        attributes: { purpose: "kaluga-dtp" },
      });

      map.on("styleload", () => {
        if (!map) return;

        addDtpLayers(map);

        labels.forEach((label) => label.destroy());
        labels = createDtpLabels(mapgl, map, dtpPoints);
      });
    });

    return () => {
      destroyed = true;
      labels.forEach((label) => label.destroy());
      map?.destroy();
      mapRef.current = null;
    };
  }, [dtpPoints]);

  return (
    <main className="app">
      <section className="map-section" aria-label="Карта ДТП Калуги">
        <div id="map-container" />
      </section>
    </main>
  );
}
