# OD Pairs segment count
This script calculates the amount of times a given segment is used for the given OD pairs. This is used to determine what the most important segments in a network are.
It starts by calculating a route for each OD pair using the **fastest path** method according to the OSRM speed profile in `instance/osrm_profile-haiti` of the [road-planning-functions](https://github.com/developmentseed/road-planning-functions) repo, and then counts the segments using their id.

Success example:
```json
{
  "4":1,
  "5":1,
  "6":1,
  "7":4,
  "11":1,
  "12":24
  // ...
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

### Road network
**Getting the road-network**
```
aws s3 cp s3://road-data-production-haiti/roads/base-rn.osm road-network.osm
```

NOTE: Each way must have an `id` tag that uniquely identifies the way.

To convert the road network to OSRM format:
```bash
# Profile need to be in directory for docker to access it
cp ../lib/instance/osrm_profile-haiti.lua profile.lua

# Run OSRM
docker run -t -v "${PWD}:/data" developmentseed/osrm-backend:v5.22.0 osrm-extract -p /data/profile.lua /data/road-network.osm
docker run -t -v "${PWD}:/data" developmentseed/osrm-backend:v5.22.0 osrm-partition /data/road-network.osrm
docker run -t -v "${PWD}:/data" developmentseed/osrm-backend:v5.22.0 osrm-customize /data/road-network.osrm

# Move things around
mkdir rn
mv road-network.osrm* rn
```

### OD pairs
The od pairs file should follow the format described by [od-generator](https://github.com/developmentseed/od-generator).

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

**Getting the OD pairs**
```
aws s3 cp --recursive s3://road-data-input-haiti/od/ ./od-pairs
```

## Running the script
Run the script with

```
node index.js
```

Upload to s3 with
```
aws s3 cp --recursive ./results s3://road-data-production-haiti/segment-count