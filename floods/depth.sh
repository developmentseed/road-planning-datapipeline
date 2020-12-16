# Project ID used to namepsace the files
PROJECT_ID=haiti

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production
TMP_INPUT=./.tmp/$PROJECT_ID/input/floods
TMP_OUTPUT=./.tmp/$PROJECT_ID/output/floods

RETURN_PERIODS=(5 10 20 50 75 100 200 250 500 1000)
# FLOOD_TYPES=(FD FU PD PU)
FLOOD_TYPES=(FU PU)

echo 'Housekeeping and getting data from S3...'
rm -rf ./.tmp/$PROJECT_ID/output/floods/
mkdir ./.tmp/$PROJECT_ID/input/ -p
mkdir ./.tmp/$PROJECT_ID/output/floods/json -p

aws s3 sync s3://$S3_INPUT-$PROJECT_ID/floods/ $TMP_INPUT/cog/
aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/roads/base-rn.geojson ./.tmp/$PROJECT_ID/input/floods/ # load GeoJSON road network data

for rp in ${RETURN_PERIODS[@]}; do
  for flood in ${FLOOD_TYPES[@]}; do
    # 1. Filter geojson down to investible roads and pipe single features
    # 2. Use rasterio to get zonalstats per road segment, and pipe GeoJSON ft
    # 3. Pipe the properties and omit segments that do not intersect with flood
    # 4. Slurp and write to JSON
    echo 'Getting depths for '$flood' with '$rp' year return period.'
    cat $TMP_INPUT/base-rn.geojson \
      | jq -c '.features[] | select(.properties.investible)' \
      | rio zonalstats -r $TMP_INPUT/cog/HT-$flood-$rp-1.tif --stats 'min max count mean nodata median' --sequence \
      | jq '.properties | select(._count > 0) | [.roadId, .id, "'$flood'", '$rp', ._min, ._max, ._count, ._mean, ._nodata]'\
      | jq --slurp '.' \
      > $TMP_OUTPUT/json/depths-$flood-$rp.json
  done
done

# Combine the JSON files for the separate floods depths in a single CSV
echo 'Combining all depths into on CSV'
jq -s .[] $TMP_OUTPUT/json/*.json \
  | jq -r '.[] | @csv' \
  > $TMP_OUTPUT/depths.csv

# Add header to the CSV
sed -i 1i"roadId,id,flood,rp,min,max,count,mean,nodata" $TMP_OUTPUT/depths.csv

echo 'Creating the index files'
node floods/depths2index.js $TMP_INPUT $TMP_OUTPUT

echo 'Syncing the depth and index files with '$S3_OUTPUT...
aws s3 cp \
  $TMP_OUTPUT \
  s3://$S3_OUTPUT-$PROJECT_ID/floods \
  --recursive \
  --exclude 'json/depths*' \
  --content-encoding gzip \
  --acl public-read \
  --quiet
