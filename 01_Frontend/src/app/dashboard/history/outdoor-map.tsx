import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import haversineDistance from "haversine-distance";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Spinner } from "@/components/ui/spinner";
import { axiosInstance, endpoints, type ApiEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/detail-formatters";
import { getOutdoorLocation } from "@/lib/location-helpers";

const ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
const DEFAULT_CENTER: [number, number] = [8.4312, 47.1416];
const DEFAULT_ZOOM = 12;
const LOOKBACK_DAYS = 7;
const FADE_WINDOW_MS = LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
const MIN_FEATURE_DISTANCE_METERS = 20;

const POINTS_SOURCE_ID = "outdoor-locations";
const POINTS_LAYER_ID = "outdoor-locations-points";
const PATH_SOURCE_ID = "outdoor-location-path";
const PATH_LAYER_ID = "outdoor-location-path-line";
const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type OutdoorFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    opacity: number;
    time: string;
    coordinates: string;
  }
>;

export function OutdoorMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["events", "outdoorLocation", LOOKBACK_DAYS],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiEvent[]>(
        endpoints.event.byTypeAndDays(LOOKBACK_DAYS, "outdoorLocation"),
      );
      return response.data;
    },
  });

  const features = useMemo(
    () => buildFeatures(eventsQuery.data ?? []),
    [eventsQuery.data],
  );

  useEffect(() => {
    if (!ACCESS_TOKEN || !containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.on("load", () => setIsMapLoaded(true));
    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    updateMapData(map, features);
    ensureMapLayers(map);
    autoCenterOnLatestFeature(
      map,
      getLatestFeature(features),
      hasAutoCenteredRef,
    );
  }, [features, isMapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !map.getLayer(POINTS_LAYER_ID)) return;

    return bindPointPopup(map, popupRef);
  }, [isMapLoaded]);

  if (!ACCESS_TOKEN) {
    return (
      <div className="flex flex-col gap-2">
        <div className="leading-none font-semibold">Outdoor location</div>
        <div className="text-muted-foreground text-sm">
          Mapbox access token missing.
        </div>
      </div>
    );
  }

  const description = eventsQuery.isError
    ? "Failed to load recent outdoor locations."
    : features.length > 0
      ? `Recent outdoor locations fade with age over the last ${LOOKBACK_DAYS} days.`
      : "No recent outdoor locations.";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="leading-none font-semibold">Outdoor location</div>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      <div className="relative h-[320px] overflow-hidden rounded-lg border">
        {eventsQuery.isLoading ? (
          <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/80 text-sm">
            <Spinner />
            Loading outdoor locations...
          </div>
        ) : null}
        <div ref={containerRef} className="h-full" />
      </div>
    </div>
  );
}

function buildFeatures(events: ApiEvent[]): OutdoorFeature[] {
  const now = Date.now();

  const features = events
    .map((event): OutdoorFeature | null => {
      const location = getOutdoorLocation(event);
      const eventTime = new Date(event.time).getTime();

      if (!location || Number.isNaN(eventTime)) {
        return null;
      }

      const ageRatio = Math.max(
        0,
        Math.min(1, (now - eventTime) / FADE_WINDOW_MS),
      );

      return {
        type: "Feature",
        properties: {
          opacity: Math.max(0.16, 1 - ageRatio),
          time: event.time,
          coordinates: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        },
        geometry: {
          type: "Point",
          coordinates: [location.lng, location.lat],
        },
      };
    })
    .filter((feature): feature is OutdoorFeature => feature !== null);

  return filterNearbyFeatures(features.sort(compareFeatureTime));
}

function buildPathFeature(features: OutdoorFeature[]) {
  const coordinates = features.map((feature) => feature.geometry.coordinates);

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  } satisfies GeoJSON.Feature<GeoJSON.LineString>;
}

function getLatestFeature(features: OutdoorFeature[]) {
  return features.reduce<OutdoorFeature | null>((latest, feature) => {
    if (!latest) return feature;
    return compareFeatureTime(feature, latest) > 0 ? feature : latest;
  }, null);
}

function compareFeatureTime(left: OutdoorFeature, right: OutdoorFeature) {
  return (
    new Date(left.properties.time).getTime() -
    new Date(right.properties.time).getTime()
  );
}

function filterNearbyFeatures(features: OutdoorFeature[]) {
  const filtered: OutdoorFeature[] = [];

  for (const feature of features) {
    const previous = filtered[filtered.length - 1];
    if (
      !previous ||
      getFeatureDistanceMeters(previous, feature) >= MIN_FEATURE_DISTANCE_METERS
    ) {
      filtered.push(feature);
    }
  }

  return filtered;
}

function getFeatureDistanceMeters(left: OutdoorFeature, right: OutdoorFeature) {
  const [leftLng, leftLat] = left.geometry.coordinates;
  const [rightLng, rightLat] = right.geometry.coordinates;

  return haversineDistance(
    { lat: leftLat, lng: leftLng },
    { lat: rightLat, lng: rightLng },
  );
}

function updateMapData(map: mapboxgl.Map, features: OutdoorFeature[]) {
  const points: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    OutdoorFeature["properties"]
  > = {
    type: "FeatureCollection",
    features,
  };

  const path =
    features.length >= 2
      ? buildPathFeature(features)
      : EMPTY_FEATURE_COLLECTION;

  upsertGeoJsonSource(map, POINTS_SOURCE_ID, points);
  upsertGeoJsonSource(map, PATH_SOURCE_ID, path);
}

function ensureMapLayers(map: mapboxgl.Map) {
  if (!map.getLayer(PATH_LAYER_ID)) addPathLayer(map);
  if (!map.getLayer(POINTS_LAYER_ID)) addPointsLayer(map);
}

function addPathLayer(map: mapboxgl.Map) {
  map.addLayer({
    id: PATH_LAYER_ID,
    type: "line",
    source: PATH_SOURCE_ID,
    paint: {
      "line-color": "#1d4ed8",
      "line-width": 3,
      "line-opacity": 0.62,
    },
  });
}

function addPointsLayer(map: mapboxgl.Map) {
  map.addLayer({
    id: POINTS_LAYER_ID,
    type: "circle",
    source: POINTS_SOURCE_ID,
    paint: {
      "circle-color": "#2563eb",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 7, 14, 12],
      "circle-opacity": ["get", "opacity"],
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.85,
    },
  });
}

function autoCenterOnLatestFeature(
  map: mapboxgl.Map,
  latestFeature: OutdoorFeature | null,
  hasAutoCenteredRef: { current: boolean },
) {
  if (!latestFeature || hasAutoCenteredRef.current) return;

  const [lng, lat] = latestFeature.geometry.coordinates;
  map.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13) });
  hasAutoCenteredRef.current = true;
}

function upsertGeoJsonSource(
  map: mapboxgl.Map,
  id: string,
  data: GeoJSON.Feature | GeoJSON.FeatureCollection,
) {
  const existing = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;

  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(id, { type: "geojson", data });
}

function bindPointPopup(
  map: mapboxgl.Map,
  popupRef: { current: mapboxgl.Popup | null },
) {
  const hidePopup = () => {
    popupRef.current?.remove();
    popupRef.current = null;
  };

  const showPopup = (event: mapboxgl.MapMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;

    const [lng, lat] = feature.geometry.coordinates as [number, number];

    hidePopup();
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
    })
      .setLngLat([lng, lat])
      .setHTML(getPopupHtml(feature.properties))
      .addTo(map);
  };

  map.on("mouseenter", POINTS_LAYER_ID, showPopup);
  map.on("mousemove", POINTS_LAYER_ID, showPopup);
  map.on("mouseleave", POINTS_LAYER_ID, hidePopup);
  map.on("click", POINTS_LAYER_ID, showPopup);

  return () => {
    map.off("mouseenter", POINTS_LAYER_ID, showPopup);
    map.off("mousemove", POINTS_LAYER_ID, showPopup);
    map.off("mouseleave", POINTS_LAYER_ID, hidePopup);
    map.off("click", POINTS_LAYER_ID, showPopup);
    hidePopup();
  };
}

function getPopupHtml(properties: mapboxgl.GeoJSONFeature["properties"]) {
  const time = typeof properties?.time === "string" ? properties.time : null;
  const coordinates =
    typeof properties?.coordinates === "string" ? properties.coordinates : null;

  return `
    <div style="font: 12px/1.4 system-ui, sans-serif;">
      <div style="font-weight: 600; margin-bottom: 2px;">Outdoor location</div>
      <div>${time ? formatDateTime(time) : "Unknown time"}</div>
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${coordinates ?? ""}</div>
    </div>
  `;
}
