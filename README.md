# Haiti Road Planning Datapipeline
A set of scripts to process data for the Haiti Road Planning project.
Check each folder for documentation.

## Install

```
yarn install
git submodule init
git submodule update
```

The Road planning backend uses a git submodule to store shared functions between the different components of the project. (datapipeline, backend, ...)
The source repo can be found at [road-planning-functions](https://github.com/developmentseed/road-planning-functions/).

Every time there's an update, use `git submodule update` to bring the submodule up to speed.

# Base data

## Road network
`/road-network`
Does the basic process and clean up of the road network data. To be run when the road network data changes.

All the other scripts require the road network to be processed.

## Bridges
`/bridges`  
Matches bridge information from the bridge information system with the road network.

Depends on:

* [road network](#road-network)

## Floods
`/floods`  
Calculates flood depth for each road segment.

Depends on:

* [road network](#road-network)

# Indicators

## AADT
`/indicators`  
Average Annual Daily Traffic per road segment.

Depends on:

* [road network](#road-network)

## EAD
`/indicators`  
Calculates Estimated Annual Damage per road segment.

Depends on:

* [road network](#road-network)
* [floods](#floods)
