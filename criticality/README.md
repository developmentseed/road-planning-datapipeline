# Criticality Indicator

## Data requirements
All files should be inside the `src-files` folder.
```
mkdir src-files
```

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
mkdir src-files/rn
mv road-network.osrm* src-files/rn
mv profile.lua src-files
mv road-network.osm src-files
```

### OD pairs
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

More info about how the OD pairs were generated can be found in [road-planning-datapipeline#14](https://github.com/developmentseed/road-planning-datapipeline/issues/14)

**Getting the OD pairs**
```
aws s3 cp s3://road-data-input-haiti/roads/odpairs.json src-files/
```

# Ways index
List of all ways with their nodes ids and properties.
The result is an array with an object per way:

This can be generated with the `extract-ways` script:
```
node ../road-network/extract-ways.js road-network.osm src-files/roadnetwork-osm-ways.json
```

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

## Running the script
Run the script with

```
node --max_old_space_size=4096 index.js
```