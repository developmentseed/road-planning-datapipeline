# Indicators
## Flood depths

**Definition** - the maximum flood depth in meters per road segment, per flood type.  
**Methodology** - take the maximum flood depth for each return period, and calculate a single value using the trapezoidal rule.

### Running the script
```
$ bash indicators/flood-hazard.sh
```

Outputs a single file per flood type with the max depth in meters:

``` csv
roadId,value
RA100099-0,0
RA100010-14,0.39
RA100013-16,0
RD204-32,0.01
```

### Pre-requisites
Requires the following scripts to have run:

* [road network data](../road-network)
* [flood depths](../floods)
