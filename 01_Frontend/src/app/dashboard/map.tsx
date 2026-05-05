import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ""
const defaultCenter: [number, number] = [8.4312, 47.1416]
const radiusSourceId = "focus-radius"
const radiusFillLayerId = "focus-radius-fill"
const radiusOutlineLayerId = "focus-radius-outline"

type MapWithRadiusProps = {
  title?: string
  description?: string
  center?: [number, number]
  zoom?: number
  radiusMeters?: number
}

function createCircleGeoJson(
  [lng, lat]: [number, number],
  radiusMeters: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const earthRadius = 6_378_137
  const latRadians = (lat * Math.PI) / 180
  const coordinates: [number, number][] = []

  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2
    const dx = radiusMeters * Math.cos(angle)
    const dy = radiusMeters * Math.sin(angle)
    const nextLat = lat + (dy / earthRadius) * (180 / Math.PI)
    const nextLng =
      lng + (dx / (earthRadius * Math.cos(latRadians))) * (180 / Math.PI)

    coordinates.push([nextLng, nextLat])
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  }
}

export default function MapWithRadius({
  title = "Map",
  description = "Base map centered on a point, ready for markers and radius overlays.",
  center = defaultCenter,
  zoom = 12,
  radiusMeters,
}: MapWithRadiusProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    if (!accessToken || !mapContainerRef.current || mapInstanceRef.current) {
      return
    }

    mapboxgl.accessToken = accessToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    })

    map.on("load", () => {
      setIsMapLoaded(true)
    })

    mapInstanceRef.current = map

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapInstanceRef.current = null
      setIsMapLoaded(false)
    }
  }, [center, zoom])

  useEffect(() => {
    const map = mapInstanceRef.current

    if (!map || !isMapLoaded) {
      return
    }

    map.jumpTo({ center, zoom })

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#0f766e" })
        .setLngLat(center)
        .addTo(map)
    } else {
      markerRef.current.setLngLat(center)
    }

    const existingSource = map.getSource(radiusSourceId) as
      | mapboxgl.GeoJSONSource
      | undefined

    if (radiusMeters && radiusMeters > 0) {
      const data = createCircleGeoJson(center, radiusMeters)

      if (existingSource) {
        existingSource.setData(data)
      } else {
        map.addSource(radiusSourceId, {
          type: "geojson",
          data,
        })
        map.addLayer({
          id: radiusFillLayerId,
          type: "fill",
          source: radiusSourceId,
          paint: {
            "fill-color": "#0f766e",
            "fill-opacity": 0.12,
          },
        })
        map.addLayer({
          id: radiusOutlineLayerId,
          type: "line",
          source: radiusSourceId,
          paint: {
            "line-color": "#0f766e",
            "line-width": 2,
          },
        })
      }
      return
    }

    if (map.getLayer(radiusFillLayerId)) {
      map.removeLayer(radiusFillLayerId)
    }
    if (map.getLayer(radiusOutlineLayerId)) {
      map.removeLayer(radiusOutlineLayerId)
    }
    if (existingSource) {
      map.removeSource(radiusSourceId)
    }
  }, [center, isMapLoaded, radiusMeters, zoom])

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Mapbox access token missing.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={mapContainerRef}
          className="h-[320px] overflow-hidden rounded-lg border"
        />
      </CardContent>
    </Card>
  )
}
