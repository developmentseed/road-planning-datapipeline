# Criticality Indicator

## Data requirements
All files should be inside the `src-files` folder.

### Road network
**Getting the road-network**
Must be the RN built with the speed profile (as opposed to ruc profile)
```
aws s3 cp --recursive s3://road-data-production-haiti/roads/osrm/speed src-files/rn
```

### Ways index
List of all ways with their nodes ids and properties.
```
aws s3 cp s3://road-data-production-haiti/roads/roadnetwork-osm-ways.json src-files/
```

```
[
  {
    "type": "way",
    "id": "234",
    "visible": true,
    "nodes": ["235","236","237","238"],
    "tags": {
      "seasonality": "",
      "route": "RU10230008",
      "mbId": "8",
      "surface": "",
      "investible": "false",
      "width": "",
      "length": "110",
      "roadId": "RU10230008-8",
      "type": "RU",
      "id": "8"
    }
  }
  ...
]
```

### OD pairs
The od pairs file should be named `odpairs.geojson` and should be a `FeatureCollection` with all the Points to consider.

**Getting the OD pairs**
```
aws s3 cp s3://road-data-input-haiti/population/populated-places.geojson src-files/odpairs.geojson
```

## Running the script
Run the script with

```
node --max_old_space_size=4096 index.js
```

### Setting up EC2
Dev instruction to run the criticality script in a EC2 - used t3a.xlarge

```
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# Source it
/home/ec2-user/.bashrc

# Install git
sudo yum install git -y

# Clone repo
git clone https://github.com/developmentseed/road-planning-datapipeline.git

nvm install
npm i -g yarn
yarn

# Set aws credentials and get data
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=

# Get the data

# Use Linux Screen to keep things running
## https://linuxize.com/post/how-to-use-linux-screen/
sudo yum install screen

# New screen session and run
screen -S criticality
node --max_old_space_size=4096 index.js

# Zip results
zip criticality.zip -r workdir/

# store on aws
aws s3 cp criticality.zip s3://road-data-production-haiti/
```
