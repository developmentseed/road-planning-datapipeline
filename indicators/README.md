# Indicators
The CSV files with indicator data should be structured as follows:

``` csv
roadId,value,score
RA100099-0,0,0
RA100010-14,0.39,1
RA100013-16,0,
RD204-32,0.01
```

`value` refers to the raw indicator value.
`score` is a score between 0 - 100 that the application uses to apply the prioritization weight to.

## AADT

**Value** - Average Annual Daily Traffic for each road segment

```
$ bash indicators/aadt.sh
```

Outputs a single file with the AADT value per road type.

### Pre-requisites:

* [road network data](../road-network) has to be prepared
* **AADT per segment**  
`s3://[bucket]/roads/aadt-per-way.csv`  

## Flood depths

**Value** - the maximum flood depth in meters per road segment, per flood type.  
**Methodology** - take the maximum flood depth for each return period, and calculate a single value using the trapezoidal rule.

```
$ bash indicators/flood-hazard.sh
```

### Pre-requisites
Requires the following scripts to have run:

* [road network data](../road-network)
* [flood depths](../floods)
