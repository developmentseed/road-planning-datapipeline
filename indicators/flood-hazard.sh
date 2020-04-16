# Project ID used to namepsace the files
PROJECT_ID=haiti

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production
TMP_INPUT=./.tmp/$PROJECT_ID/input/indicators
TMP_OUTPUT=./.tmp/$PROJECT_ID/output/indicators

FLOOD_TYPES=(FU FD PU PD)

echo 'Housekeeping and getting data from S3...'
rm -rf ./.tmp/$PROJECT_ID/output/indicators/
mkdir -p ./.tmp/$PROJECT_ID/input/
mkdir -p ./.tmp/$PROJECT_ID/output/indicators

aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/roads/rn-props.csv $TMP_INPUT
aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/floods/depths.csv $TMP_INPUT

for flood in ${FLOOD_TYPES[@]}; do
  echo 'Calculating depths for '$flood
  node indicators/flood-hazard.js $TMP_INPUT $TMP_OUTPUT $flood
done

echo 'Syncing the flood indicator file with '$S3_OUTPUT'...'
aws s3 sync \
  $TMP_OUTPUT \
  s3://$S3_OUTPUT-$PROJECT_ID/indicators \
  --delete \
  --content-encoding gzip \
  --acl public-read \
  --quiet
