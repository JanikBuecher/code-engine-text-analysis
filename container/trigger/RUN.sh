#!/bin/bash

# Env Vars:
# REGISTRY: name of the image registry/namespace to get the images
# COS_ID: If set, specifies the full CRN of a Cloud Object Storage instance to
# use

export REGISTRY=${REGISTRY:-janikbuecheribm}
export PROJECT_NAME=$(ibmcloud ce project current | \
  awk -F: '/Project Name/{ print $2 }' | sed "s/ *$//")
export PROJECT_ID=$(ibmcloud ce project get --name ${PROJECT_NAME} | \
  awk '/^ID/{ print $2 }')
export POLICY_ID=""
export BUCKET="entry3-bucket"

# Clean up previous run
function clean() {
  set +ex
  echo "Cleaning..."

  (
  ibmcloud ce sub cos delete -n cos-sub -f --wait=true
  if [[ -n "$POLICY_ID" ]]; then
    ibmcloud iam authorization-policy-delete $POLICY_ID --force
  fi
  ibmcloud ce app delete --name cos-app --force
  
  rm -f out
  ) > /dev/null 2>&1
}

clean
[[ "$1" == "clean" ]] && exit 0


set -ex

CID="crn:v1:bluemix:public:cloud-object-storage:global:a/26247a9e0b3a8c78d5d2867054fd0c6f:397aa18a-951c-4e18-9a9d-912c700aec19::"


# Set the COS config to use this instance
ibmcloud cos config crn --crn $CID --force
ibmcloud cos config auth --method IAM

# Create IAM authorization policy so we can receive notifications from COS
POLICY_ID=$(ibmcloud iam authorization-policy-create codeengine \
 cloud-object-storage "Notifications Manager" \
 --source-service-instance-name ${PROJECT_NAME} \
 --target-service-instance-id ${CID} | awk '/^Authorization/{ print $3 }')


# Create the app && save its URL for later
ibmcloud ce app create -n cos-app --image ${REGISTRY}/trigger \
  --min-scale=1 --max-scale=1 -e API_KEY=jkA4s62JFXw_AhXM3O60KmNfy1EVqP-IjY0SrMJTc8PS
#URL=$(ibmcloud ce app get --output jsonpath='{.status.url}' --name cos-app)

# Setup the COS Event Source
ibmcloud ce sub cos create -n cos-sub -d cos-app -b ${BUCKET} -e write --path "/events/cos"

# Extract the instance name from `ibmcloud ce app get`
INSTANCE=$(ibmcloud ce app get --name cos-app| awk '/cos.*Running/{ print $1 }')
echo Instance name: $INSTANCE





