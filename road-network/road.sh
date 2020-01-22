# Project ID used to namepsace the files
PROJECT_ID=haiti
RN=RoutesRAI_2015.shp

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production

echo 'Housekeeping and getting data from S3.'
rm -rf ./.tmp/$PROJECT_ID/output/roads
mkdir ./.tmp/$PROJECT_ID/input -p
mkdir ./.tmp/$PROJECT_ID/output/roads -p

aws s3 sync s3://$S3_INPUT-$PROJECT_ID/roads/ ./.tmp/$PROJECT_ID/input/roads

echo 'Building Docker image for processing'
docker build -t rn-processing ./road-network/ -q

echo 'Generate the base GeoJSON'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  rn-processing \
    ogr2ogr \
    -f "GeoJSON" \
    /data/output/roads/raw-rn.geojson \
    /data/input/roads/$RN \
    -t_srs EPSG:4326

echo 'Clean up the road network properties'
node ./road-network/rn-clean.js ./.tmp/$PROJECT_ID/output/roads/raw-rn.geojson ./.tmp/$PROJECT_ID/output/roads/base-rn.geojson

# Clean up intermediate files
rm -f ./.tmp/$PROJECT_ID/output/roads/raw-rn.geojson

echo 'Generating the Vector Tiles'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  rn-processing \
  tippecanoe \
    -e /data/output/roads/tiles \
    -n roads \
    -L roads:/data/output/roads/base-rn.geojson

echo 'Generate the OSM XML'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  rn-processing \
  python ./ogr2osm/ogr2osm.py \
    /data/output/roads/base-rn.geojson \
    -o /data/output/roads/base-rn.osm

echo 'Generate the OSRM files'
docker run -it --rm \
  -v $(pwd)/.tmp/$PROJECT_ID/:/data \
  osrm/osrm-backend \
  osrm-extract \
    -p /opt/car.lua
    # -p /data/input/roads/osrm_profile.lua \
    /data/output/roads/base-rn.osm

echo 'All output files stored in /.tmp/'$PROJECT_ID'/output/roads/'

echo 'Syncing all files with '$S3_OUTPUT
aws s3 sync \
  ./.tmp/$PROJECT_ID/output/roads/ \
  s3://$S3_OUTPUT-$PROJECT_ID/roads \
  --delete \
  --content-encoding gzip \
  --acl public-read
  --quiet
