# Project ID used to namepsace the files
PROJECT_ID=haiti
RN=RoutesRAI_2015.shp

# S3 buckets, for input and output data
S3_INPUT=road-data-input
S3_OUTPUT=road-data-production

echo 'Housekeeping and getting data from S3...'
rm -rf ./.tmp/$PROJECT_ID/output/bridges
mkdir ./.tmp/$PROJECT_ID/input -p
mkdir ./.tmp/$PROJECT_ID/output/bridges -p

aws s3 sync s3://$S3_INPUT-$PROJECT_ID/bridges/ ./.tmp/$PROJECT_ID/input/bridges
aws s3 cp s3://$S3_OUTPUT-$PROJECT_ID/roads/base-rn.geojson ./.tmp/$PROJECT_ID/input/bridges/ # load GeoJSON road network data

echo 'Cleaning the base bridge data'
node bridges/clean.js ./.tmp/$PROJECT_ID/input/bridges ./.tmp/$PROJECT_ID/output/bridges

echo 'Match the bridges to their closest road segment'
node bridges/match.js ./.tmp/$PROJECT_ID/input/bridges ./.tmp/$PROJECT_ID/output/bridges

echo 'All output files stored in /.tmp/'$PROJECT_ID'/output/bridges/'
echo 'Syncing all files with '$S3_OUTPUT...
aws s3 sync \
  ./.tmp/$PROJECT_ID/output/bridges/ \
  s3://$S3_OUTPUT-$PROJECT_ID/bridges \
  --delete \
  --content-encoding gzip \
  --acl public-read \
  --quiet
