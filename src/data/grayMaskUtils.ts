import type { Polygon, MultiPolygon } from "geojson"

const WORLD_RECT: GeoJSON.Position[] = [
  [-180, -90],
  [-180, 90],
  [180, 90],
  [180, -90],
  [-180, -90],
]

function reverseRing(ring: GeoJSON.Position[]): GeoJSON.Position[] {
  const out = [...ring]
  out.reverse()
  return out
}

function getExteriorRings(
  geom: Polygon | MultiPolygon
): GeoJSON.Position[][] {
  if (geom.type === "Polygon") {
    return [geom.coordinates[0]]
  }
  return geom.coordinates.map((p) => p[0])
}

export function buildGrayMaskGeoJSON(
  koreaFeatures: GeoJSON.Feature[]
): GeoJSON.Polygon | null {
  const holes: GeoJSON.Position[][] = []
  for (const f of koreaFeatures) {
    const geom = f.geometry
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) continue
    const rings = getExteriorRings(geom)
    for (const ring of rings) {
      if (ring.length >= 4) {
        holes.push(reverseRing(ring))
      }
    }
  }
  if (holes.length === 0) return null
  return {
    type: "Polygon",
    coordinates: [WORLD_RECT, ...holes],
  }
}
