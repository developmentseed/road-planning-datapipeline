# Project ID used to namepsace the files
PROJECT_ID=haiti
RN=RoutesRAI_2015.shp

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production

echo 'Housekeeping and getting data from S3...'
rm -rf ./.tmp/$PROJECT_ID/output/roads
mkdir ./.tmp/$PROJECT_ID/input -p
mkdir ./.tmp/$PROJECT_ID/output/roads -p

aws s3 sync s3://$S3_INPUT-$PROJECT_ID/roads/ ./.tmp/$PROJECT_ID/input/roads

echo 'Building Docker image for processing...'
docker build -t rn-processing ./road-network/ -q

# -explodecollections will turn multilinestring into linestring
echo 'Generating the base GeoJSON...'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  rn-processing \
    ogr2ogr \
    -f "GeoJSON" \
    /data/output/roads/raw-rn.geojson \
    /data/input/roads/$RN \
    -t_srs EPSG:4326 \
    -explodecollections

echo 'Cleaning up the road network properties...'
node ./road-network/rn-clean.js ./.tmp/$PROJECT_ID/output/roads/raw-rn.geojson ./.tmp/$PROJECT_ID/output/roads/base-rn.geojson

# Clean up intermediate files
rm -f ./.tmp/$PROJECT_ID/output/roads/raw-rn.geojson

echo 'Generating a CSV file to populate the database...'
node ./road-network/props-csv.js ./.tmp/$PROJECT_ID/output/roads/base-rn.geojson ./.tmp/$PROJECT_ID/output/roads/rn-props.csv

echo 'Generating the Vector Tiles...'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  rn-processing \
  tippecanoe \
    -e /data/output/roads/tiles \
    -n roads \
    -L roads:/data/output/roads/base-rn.geojson \
    --use-attribute-for-id=mbId

echo 'Generating the OSM XML...'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  rn-processing \
  python ./ogr2osm/ogr2osm.py \
    /data/output/roads/base-rn.geojson \
    -o /data/output/roads/base-rn.osm \
    --positive-id

echo 'Generating the OSRM files with the RUC profile...'
cp $(pwd)/lib/instance/ruc-profile.lua $(pwd)/.tmp/$PROJECT_ID/input/roads

# Run extract on the OSM XML
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-extract \
    -p /data/input/roads/ruc-profile.lua \
    /data/output/roads/base-rn.osm

# Move OSRM files to folder for organization purposes
mkdir ./.tmp/$PROJECT_ID/output/roads/osrm/ruc -p
mv ./.tmp/$PROJECT_ID/output/roads/*.osrm* ./.tmp/$PROJECT_ID/output/roads/osrm/ruc/

# Run partition and customize
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-partition \
    /data/output/roads/osrm/ruc/base-rn.osrm

docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-customize \
    /data/output/roads/osrm/ruc/base-rn.osrm


echo 'Generating the OSRM files with the speed based profile...'
cp $(pwd)/lib/instance/osrm_profile-haiti.lua $(pwd)/.tmp/$PROJECT_ID/input/roads

# Run extract on the OSM XML
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-extract \
    -p /data/input/roads/osrm_profile-haiti.lua \
    /data/output/roads/base-rn.osm

# Move OSRM files to folder for organization purposes
mkdir ./.tmp/$PROJECT_ID/output/roads/osrm/speed -p
mv ./.tmp/$PROJECT_ID/output/roads/*.osrm* ./.tmp/$PROJECT_ID/output/roads/osrm/speed/

# Run partition and customize
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-partition \
    /data/output/roads/osrm/speed/base-rn.osrm

docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  --user $(id -u):$(id -g) \
  developmentseed/osrm-backend:v5.22.0 \
  osrm-customize \
    /data/output/roads/osrm/speed/base-rn.osrm

# Create a list of all ways with their nodes ids and properties
echo 'Extract ways...'
node ./road-network/extract-ways.js ./.tmp/$PROJECT_ID/output/roads/base-rn.osm ./.tmp/$PROJECT_ID/output/roads/roadnetwork-osm-ways.json

echo 'All output files stored in /.tmp/'$PROJECT_ID'/output/roads/'

echo 'Syncing all files with '$S3_OUTPUT...
aws s3 sync \
  ./.tmp/$PROJECT_ID/output/roads/ \
  s3://$S3_OUTPUT-$PROJECT_ID/roads \
  --delete \
  --content-encoding gzip \
  --acl public-read \
  --quiet
