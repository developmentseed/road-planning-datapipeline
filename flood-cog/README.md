# Flood COG
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