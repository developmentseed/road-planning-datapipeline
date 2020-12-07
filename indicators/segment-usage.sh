# Project ID used to namepsace the files
PROJECT_ID=haiti

# S3 buckets, for input and output data
S3_OUTPUT=road-data-production
TMP_INPUT=./.tmp/$PROJECT_ID/input/indicators/segment-usage
TMP_OUTPUT=./.tmp/$PROJECT_ID/output/indicators/segment-usage

# echo 'Housekeeping and getting data from S3...'
rm -rf $TMP_OUTPUT
mkdir -p $TMP_INPUT
mkdir -p $TMP_OUTPUT

aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/roads/roadnetwork-osm-ways.json $TMP_INPUT
aws s3 cp --recursive s3://$S3_OUTPUT-$PROJECT_ID/segment-count/ $TMP_INPUT

node ./indicators/segment-usage.js $TMP_INPUT $TMP_OUTPUT

echo 'Copying the segment usage indicators to s3://'$S3_OUTPUT'...'
aws s3 cp --recursive \
  $TMP_OUTPUT \
  s3://$S3_OUTPUT-$PROJECT_ID/indicators/ \
  --content-encoding gzip \
  --acl public-read \
  --quiet
