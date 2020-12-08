# OD Pairs segment count
This script calculates the amount of times a given segment is used for the given OD pairs. This is used to determine what the most important segments in a network are.
It starts by calculating a route for each OD pair using the **fastest path** method according to the OSRM speed profile in `instance/osrm_profile-haiti` of the [road-planning-functions](https://github.com/developmentseed/road-planning-functions) repo, and then counts the segments using their id.

Success example:
```json
{
  "4":1,
  "5":1,
  "6":1,
  "7":4,
  "11":1,
  "12":24
  // ...
}
```

Error example:
```json
  {
    "o": 1,
    "d": 4,
    "coordinates": [
      [
        -72.96121440103624,
        20.052509815160192
      ],
      [
        -72.840367,
        19.9378068
      ]
    ],
    "error": "NoRoute"
  }
```
## Data requirements

* base road network in `.osm` format
* OSRM routing graph generated using the speed profile (as opposed to cost (RUC) based profile)
* OD pairs following the format described by [od-generator](https://github.com/developmentseed/od-generator).

## Running the script
Run the script with

```
bash ./count.sh
```
