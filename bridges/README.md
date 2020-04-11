# Bridge processing
A set of scripts for processing of the bridges.

```
$ bash bridges/bridges.sh
```

## Input

* depends on the road network to be fully processed
* **bridge dataset**  
`s3://[bucket]/bridges/bridges.csv`  
An export from Oasis, the bridge information system in Haiti. This expects the following columns:

- `Pont` - name / description
- `Voie portée` - route
- `GPS Latitude` - lat
- `GPS Longitude` - lon
- `Obstacle franchi` - obstacle crossed (river, ravine)
- `Ouverture (m)` - length in meters
- `Structure` - structure
- `Materiau` - material

## Output
The script will do minor cleaning of the bridges and find the road segment closest to the bridge

* **JSON**  
`s3://[output_bucket]/bridges/bridges.json`
