# Haiti Road Planning Datapipeline
A set of scripts to process data for the Haiti Road Planning project.
Check each folder for documentation.

## Base data

### Road network
`/road-network`
Does the basic process and clean up of the road network data. To be run when the road network data changes.

All the other scripts require the road network to be processed.

### Bridges
`/bridges`  
Matches bridge information from the bridge information system with the road network.

Depends on:

* [road network](#road-network)

### Floods
`/floods`  
Calculates flood depth for each road segment.

Depends on:

* [road network](#road-network)

## Indicators

### EAD
`/indicators`  
Calculates Estimated Annual Damage per road segment.

Depends on:

* [road network](#road-network)
* [floods](#floods)
