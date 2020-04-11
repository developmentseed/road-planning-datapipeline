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

* **CSV**  
`s3://[output_bucket]/bridges/bridges.csv`

If the matching algorithm didn't find a road within 500 meters from the bridge, we assume it's not matched. Both `roadId` and `distanceMatchingRoad` will be `null`.

```
name,route,ig,igg,lat,lon,length,structure,material,roadId,distanceMatchingRoad
Pont Vincent  RN2,RN2,5S,17.77,18.30103,-72.37511,8,PSI-BA,Béton armé,,
Pont Chabeau (Limbe)-RN1-ND-LM-PT0006,RN1,5S,18.26,19.66892,-72.41903,17,MIXTE,Ossature mixte acier béton,,
Ponceau (Cabaret)-RD51-OU-JR-PC0025,RD51,5,18.04,19.8789,-72.96873,2,PSI-DA,Béton armé,RA090303-19691,0.06772012412797518
```