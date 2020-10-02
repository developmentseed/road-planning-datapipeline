# Project ID used to namepsace the files
PROJECT_ID=haiti

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production
TMP_INPUT=./.tmp/$PROJECT_ID/input/indicators/aadt
TMP_OUTPUT=./.tmp/$PROJECT_ID/output/indicators/aadt

echo 'Housekeeping and getting data from S3...'
rm -rf $TMP_OUTPUT
mkdir -p $TMP_INPUT
mkdir -p $TMP_OUTPUT

aws s3 cp s3://$S3_INPUT-$PROJECT_ID/roads/aadt-per-way.csv $TMP_INPUT
aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/roads/rn-props.csv $TMP_INPUT

# aadt-per-way contains our internal ID for the road segment (0,1,2)
# The database expects the Road ID (RI20230-1), reason for the join
csvjoin -c mbId,id $TMP_INPUT/aadt-per-way.csv $TMP_INPUT/rn-props.csv > $TMP_INPUT/aadt.csv
node ./indicators/aadt.js $TMP_INPUT/aadt.csv $TMP_OUTPUT

echo 'Copying the AADT indicator file to s3://'$S3_OUTPUT'...'
aws s3 cp \
  $TMP_OUTPUT/aadt.csv \
  s3://$S3_OUTPUT-$PROJECT_ID/indicators/ \
  --content-encoding gzip \
  --acl public-read \
  --quiet
