# Flood
## Depths
A script that calculates flood depths in meters for different flood types (more info below). The flood depths are calculated using rasterio zonalstats, with the support from `jq`.

```
$ bash floods/depth.sh
```

### Requirements

* [rasterio cli](https://rasterio.readthedocs.io/en/latest/cli.html)
* [jq](https://stedolan.github.io/jq/)

### Output
The process outputs a CSV with the following structure:

``` csv
roadId,id,flood,rp,min,max,count,mean
"RA100010-14",14,"FD",5,0.013906881213188171,0.5327581167221069,9,0.42234712176852757
"RD204-32",32,"FD",5,0.05331336706876755,0.06524050235748291,4,0.05644490569829941
```

This files only includes road segments that were flooded in a particular flood / return period. If a segment is not in this file, it was not flooded.

* `min` - minimum flood depth in meters
* `max` - maximum flood depth in meters
* `count` - amount of pixels the road segment intersected with
* `mean` - the mean flood depth in meters

## COG
All the original data flood masks were converted to Cloud Optimized Geotiffs to facilitate further analysis.

```
$ python cog.py ~/floods/HT_fluvial_undefended/HT-FU-5-1.tif ~/floods/HT_fluvial_undefended/HT-FU-5-1-cog.tif --nodata -9999 --nodata 999
```

In the process, it also converts -9999 (ocean) and 999 (internal water bodies) to `null` to make it easier to calculate stats. None of these are considered flooding.

## About the flood data
The GeoTIFFs are from the SSBN Global Flood Hazard dataset and were licensed to the WB. The data can't be used or shared outside the context of this project.

The data shows the maximum expected water depth in metres at 10 different return periods (between 1-in-5 and 1-in-1000 years). Two primary types of flood hazard are modelled: `fluvial` (flooding caused by rivers
overtopping their banks) and `pluvial` (flooding caused by extreme local rainfall).

For both hazards, there is a `defended` model (including the effects of estimated flood defences), and `undefended` (excluding the effects of estimated flood defences).