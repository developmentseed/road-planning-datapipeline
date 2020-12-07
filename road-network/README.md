# Road network processing
A set of scripts for initial processing of the road network.

```
$ bash road-network/road.sh
```

Requirements:

* docker
* node 12

## Input

* **road network dataset**  
`s3://[bucket]/roads/RoutesRAI_2015.shp`  
In a format supported by `gdal`. This road network needs to be routable.  
The script syncs the contents of the S3 bucket to a local directory (`./.tmp`).
* **OSRM speed profile** - optional  
`../lib/osrm_profile-haiti.lua`  
The OSRM speed profile that can be used with the road network dataset. Falls back to default speed profile that is OSM compatible. This is not stored on S3 so it's versioned, and the full project can use the same speed profile.

## Output
The script will do minor cleaning of the road segments, mostly of the properties. It produces the following datasets to be used in production:

* **GeoJSON**  
`s3://[output_bucket]/roads/base-rn.geojson`
* **OSM XML**  
`s3://[output_bucket]/roads/base-rn.osm`
* **Vector Tiles**  
`s3://[output_bucket]/roads/tiles/`
* **OSRM routing graph - RUC based**  
`s3://[output_bucket]/roads/osrm/ruc/`
* **OSRM routing graph - speed based**  
`s3://[output_bucket]/roads/osrm/speed/`
* **Way index file**  
`s3://[output_bucket]/roads/way_index.json`
* **CSV to populate the database**  
`s3://[output_bucket]/roads/rn-props.csv`

Each road segment has the following properties:

- `id` - sequential numeric ID. Eg. `1290`
- `route` - the original route ID in the dataset. Eg. `RA103`
- `roadId` - a human readable and unique road ID that includes the route number. Eg. `RA103-1290`
- `type` - the type of road. One of:
  - `RA` - Route Agricole
  - `RU` - Route Urbaine
  - `RD` - Route Departementale
  - `RC` - Route Communale
  - `RN` - Route Nationale
  - `RI` - Route International
  - `R` - Unclassified. Segments that didn't have a route classification in the original data.
- `surface` - the surface type. One of:
  - `asphalt`
  - `stabilized-soil`
  - `earth`
- `seasonality` - the seasonality of a road. One of:
  - `all-weather`
  - `dry-weather`
  - `not-passable`
- `width` - the width of the road. One of:
  - `large`
  - `medium`
  - `small`
- `length` - length of road segment in meters. Eg. `1253`

# Custom OSRM
The haiti project requires a custom version of OSRM backend which can be found at https://github.com/developmentseed/osrm-backend.
This is needed because the original OSRM does [not support float values](https://github.com/Project-OSRM/osrm-backend/issues/5079) for speed updates.
The docker container is at `developmentseed/osrm-backend:v5.22.0`

# Extract ways
Creates a list of all ways with their nodes ids and properties.
The result is an array with an object per way:

```
[
  {
    "type": "way",
    "id": "234",
    "visible": true,
    "nodes": ["235","236","237","238"],
    "tags": {
      "seasonality": "",
      "route": "RU10230008",
      "mbId": "8",
      "surface": "",
      "investible": "false",
      "width": "",
      "length": "110",
      "roadId": "RU10230008-8",
      "type": "RU",
      "id": "8"
    }
  }
  ...
]
```