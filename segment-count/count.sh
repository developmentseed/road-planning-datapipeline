# Project ID used to namepsace the files
PROJECT_ID=haiti

# S3 buckets, for input and output data
S3_INPUT=road-data-input-$PROJECT_ID
S3_OUTPUT=road-data-production-$PROJECT_ID
TMP_INPUT=./.tmp/$PROJECT_ID/input
TMP_OUTPUT=./.tmp/$PROJECT_ID/output/segment-count

echo 'Housekeeping and getting data from S3...'
rm -rf $TMP_OUTPUT
mkdir -p $TMP_INPUT
mkdir -p $TMP_OUTPUT

aws s3 cp --recursive s3://$S3_INPUT/roads/base-rn.osm $TMP_INPUT/roads/base-rn.osm
aws s3 cp --recursive s3://$S3_OUTPUT/roads/osrm/speed $TMP_INPUT/roads/osrm/speed
aws s3 cp --recursive s3://$S3_INPUT/od $TMP_INPUT/od

echo 'Running the segment count for all OD pairs'
node segment-count/index.js $TMP_INPUT $TMP_OUTPUT

echo 'All output files stored in '$TMP_OUTPUT
echo 'Syncing all files with '$S3_OUTPUT...
aws s3 sync \
  $TMP_OUTPUT \
  s3://$S3_OUTPUT/segment-count \
  --delete \
  --content-encoding gzip \
  --acl public-read \
  --quiet
