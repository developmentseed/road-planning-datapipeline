# AADT (Traffic on each way)

This script creates an index with the total AADT per ODpair, and the AADT for each way
The ODpair AADT is calculated by adding the AADT value of the ways used by the ODpair.
The pairs property is an object where each key is made of the origin and destinations indexes present in the ODpairs file.

Example:
```json
  {
    ways: {
      "0": 30,
      "1": 12
    },
    pairs: {
      "o0-d116": 180,
      "o1-d116": 210,
      "o2-d116": 150,
      "o3-d116": 150,
      "o4-d116": 300
    }
  }
```
The `pairs` has this type of key because not all ODpairs present in the ODpairs file ended up being routable, therefore making an indexed array unreliable.

## Data requirements

#### AADT per way
CSV with the AADT value for each road segment, provided by Xavier.
More at https://github.com/developmentseed/resilient-roads-haiti/issues/19

```bash
aws s3 cp s3://road-data-input-haiti/roads/aadt-per-way.csv .
```


#### OD pairs segments
File with the ids of the ways that compose the route between each ODpair.
This file is the result of [aadt-segments](../aadt-segments/README.md) calculation, but can be downloaded from s3:

```bash
aws s3 cp s3://road-data-production-haiti/aadt-segments/result.json od-pair-segments.json
```

## Running the script
Run the script with

```
node index.js
```
