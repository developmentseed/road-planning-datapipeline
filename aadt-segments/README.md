# OD Pairs segment route

This script calculates a route for each OD pair using the **shortest path** method.
It will return the distance and ids of the road segments used for each route in a `results.json` file.
Any OD pair that errors will be written out to `error.json`

Success example:
```json
  {
    "o": 2,
    "d": 0,
    "coordinates": [
      [
        -72.76297251078569,
        19.611736964063766
      ],
      [
        -72.7981088,
        19.6300311
      ]
    ],
    "distance": 4481,
    "routeSegments": [
      "11268",
      "11258",
      "11254",
      "11261",
      "12222"
    ]
  }
```

Error example:
```json
  {
    "o": 1,
    "d": 4,
    "coordinates": [
      [
        -72.96121440103624,
        20.052509815160192
      ],
      [
        -72.840367,
        19.9378068
      ]
    ],
    "error": "NoRoute"
  }
```

## Data requirements

#### Road network
Each way must have an `id` tag that uniquely identifies the way.
**Rename the road network to `road-network.osm`**

To convert the road network to OSRM format:
```
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /data/lib/profile.lua /data/road-network.osm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/road-network.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/road-network.osrm
mkdir rn
mv road-network.osrm* rn
```

#### OD pairs
The od pairs file should be named `odpair.json` and should follow the format described by [od-generator](https://github.com/developmentseed/od-generator).

From od-generator docs:
```
{
  "origins": {
    "type": "FeatureCollection",
    "features": []
  },
  "destinations": {
    "type": "FeatureCollection",
    "features": []
  },
  "pairs": [
    {
      "o": 1,
      "d": 15
    },
    {
      "o": 1,
      "d": 16
    }
  ]
}
```

## Running the script
Run the script with

```
node index.js
```