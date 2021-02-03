#!/bin/bash

# Env Vars:
# REGISTRY: name of the image registry/namespace to get the images
# COS_ID: If set, specifies the full CRN of a Cloud Object Storage instance to
# use

while getopts r:k:p:b:c:g:a: option
do
case "${option}"
in
r) REGISTRY=${OPTARG};;
k) IAM_API_KEY=${OPTARG};;
p) PROJECT_NAME=${OPTARG};;
b) BUCKET=${OPTARG};;
c) CID=${OPTARG};;
g) GROUP=${OPTARG};;
a) REGION=${OPTARG};;
esac
done


export PROJECT_ID=$(ibmcloud ce project get --name ${PROJECT_NAME} | \
  awk '/^ID/{ print $2 }')


# Clean up previous run
function clean() {
  set +ex
  echo "Cleaning..."
  (
  ibmcloud ce sub cos delete -n cos-sub -f --wait=true
  if [[ -n "$POLICY_ID" ]]; then
    ibmcloud iam authorization-policy-delete $POLICY_ID --force
  fi
  ibmcloud ce app delete --name cos-trigger --force
  
  rm -f out
  ) > /dev/null 2>&1
}

clean
[[ "$1" == "clean" ]] && exit 0


set -ex



# Set the COS config to use this instance
ibmcloud cos config crn --crn $CID --force
ibmcloud cos config auth --method IAM

# Create IAM authorization policy so we can receive notifications from COS
POLICY_ID=$(ibmcloud iam authorization-policy-create codeengine \
 cloud-object-storage "Notifications Manager" \
 --source-service-instance-name ${PROJECT_NAME} \
 --target-service-instance-id ${CID} | awk '/^Authorization/{ print $3 }')


# Create the app && save its URL for later
ibmcloud ce app create -n cos-trigger --image ${REGISTRY}/trigger \
  --min-scale=1 --max-scale=1 -e IAM_API_KEY=${IAM_API_KEY} -e PROJECT_NAME=${PROJECT_NAME} -e GROUP=${GROUP} -e REGION=${REGION}


# Setup the COS Event Source
ibmcloud ce sub cos create -n cos-sub -d cos-trigger -b ${BUCKET} -e write --path "/events/cos"

# Extract the instance name from `ibmcloud ce app get`
INSTANCE=$(ibmcloud ce app get --name cos-app| awk '/cos.*Running/{ print $1 }')
echo Instance name: $INSTANCE





