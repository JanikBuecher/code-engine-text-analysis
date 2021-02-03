# Scanning COS Files for infections when uploaded with Code Engine

Provide Virus-Scanning as a Service for usage of serverless
Welcome to this little tutorial on how to scan files for computer viruses in the IBM Cloud Object Storage (COS) with IBM Code Engine.

## Architecture

![][images/architecture.jpg =100x100]

## Prerequisites

This tutorial requires to:

1. Install the IBM Cloud CLI:
   - Mac: `curl -fsSL https://clis.cloud.ibm.com/install/osx | sh`
   - Linux: `curl -fsSL https://clis.cloud.ibm.com/install/linux | sh`
   - Windows (Powershell): `iex(New-Object Net.WebClient).DownloadString('https://clis.cloud.ibm.com/install/powershell')`
2. Install the IBM Cloud Code Engine CLI Plugin: `ibmcloud plugin install code-engine`
3. Install the IBM Cloud COS CLI Plugin: `ibmcloud plugin install cloud-object-storage`

## Setup

### Step 1: Create buckets in the IBM COS

1. Create an instance of [IBM Cloud Object Storage](https://cloud.ibm.com/catalog/services/cloud-object-storage):
   1. Select the **Lite** plan or the **Standard** plan if you already have an Object Storage service instance in your account.
   2. Set **Service name** to `code-engine-cos` and select a resource group
   3. Click on **Create**
2. Create service credentials

   1. Give it a name `cos-for-code-engine` and select Writer as the role
   2. Click **Add**

3. Under Buckets, create three custom buckets. _When you create buckets or add objects, be sure to avoid the use of Personally Identifiable Information (PII).Note: PII is information that can identify any user (natural person) by name, location, or any other means._

   - An entry bucket (Files get uploaded here)
   - A clean bucket (Clean Files get moved here)
   - A dirty bucket (Infected Files get moved here)

   1. Give the buckets a unique name like `<some_name-cos-bucket-ce>`
   2. Select **Regional** resiliency.
   3. Select a location.
   4. Select a **Standard** storage class for high performance and low latency.
   5. Click **Create** bucket

   In the end you should have three different buckets within the same region.

4. On the left pane under **Endpoints**, Select **Regional** resiliency and select a location.
5. Copy the desired Public endpoint to access your buckets and save the endpoint for quick reference.

### Step 2: Create an IBM Code Engine Project

1. In a terminal on your machine, ensure you're logged in to the `ibmcloud` CLI.
   ```console
       $ ibmcloud login
   ```
2. You will also need to target the resource group and region where you created your project.
   ```console
       $ ibmcloud target -g <YOUR_RESOURCE_GROUP_NAME> -r <YOUR_REGION>
   ```
3. Create a new project IBM Code Engine project
   ```console
       $ ibmcloud ce project create --name <YOUR_PROJECT_NAME>
   ```
4. Make the command line tooling point to your project
   ```console
       $ ibmcloud code-engine project select --name <YOUR_PROJECT_NAME>
   ```

### Step 3: Create the trigger application

1. Go to the trigger folder
   ```console
       $ cd ./container/trigger
   ```
2. Build the image
   ```console
       $ docker build . -t <YOUR_REGISTRY>/trigger
   ```
3. Push your image to your registry. _Note: You don't habe to use a docker registry_
   ```console
       $ docker push <YOUR_REGISTRY>/trigger
   ```
4. Get the IBM COS `resource_instance_id`
   1. Go to your IBM COS instance
   2. On the left pane under **Service credentials**, copy the credentials `cos-for-code-engine`
   3. Paste them into a text editor and copy the **resource_instance_id**
5. Get an`IAM_APIKEY`
   1. Go to the IBM Cloud Dashboard
   2. On the top click on Manage->Access(IAM)
   3. On the left pane click on **API keys**
   4. Create a new API Key with a custom name
   5. Copy the API Key **immediately** because this is the only time you can save it
6. Run the setup **RUN.sh** script
   ```console
       $ bash RUN.sh -r <YOUR_REGISTRY> -k <YOUR_IAM_API_KEY> -p <YOUR_PROJECT_NAME> -b <YOUR_ENTRY_BUCKET_NAME> -c <YOUR_RESOURCE_INSTANCE_ID> -g <YOUR_GROUP> -a <YOUR_REGION>
   ```

### Step 4: Create the virus-scan job

1. Go to the virus-job folder
   ```console
       $ cd ./container/virus-job
   ```
2. Build the image
   ```console
       $ docker build . -t <YOUR_REGISTRY>/<YOUR_IMAGE_NAME>
   ```
3. Push your image to your registry. _Note: You don't habe to use a docker registry_
   ```console
       $ docker push <YOUR_REGISTRY>/<YOUR_IMAGE_NAME>
   ```
4. Create the virus-job in IBM Code Engine with 2Gi of RAM, because the anti-virus software needs that much
   ```console
      $ ibmcloud ce job create -n vir-scan -i <YOUR_REGISTRY>/<YOUR_IMAGE_NAME> --memory 2Gi
   ```

### Step 5: Connect the virus-scan job with your IBM COS instance

1. Create a binding for Object Storage service with a prefix **COS** for ease of use in your application. Creating this binding will give your Code Engine application access to the service credentials for IBM Cloud Object Storage so that it can store files in COS. _Note: Each service binding can be configured to use a custom environment variable prefix by using the --prefix flag._
   ```console
      $ ibmcloud code-engine job bind --name vir-scan --service-instance
        code-engine-cos --service-credential cos-for-code-engine --prefix COS
   ```
2. You will also need to provide the application with your Bucket names where you want to move the files, as well as your COS endpoint. Define a configmap to hold the bucket name and the endpoint as the information isn't sensitive. ConfigMaps are a Kubernetes object, which allows you to decouple configuration artifacts from image content to keep containerized applications portable. You could create this configmap from a file or from a key value pair -- for now we'll use a key value pair with the `--from-literal` flag.
   ```console
      $ ibmcloud code-engine configmap create --name virus-scan-configuration                    --from-literal=COS_BUCKET_DIRTY=<COS_BUCKET_NAME>
      --from-literal=COS_BUCKET_CLEAN=<COS_BUCKET_NAME>
      --from-literal=COS_BUCKET_ENTRY=<COS_BUCKET_NAME>
      --from-literal=COS_ENDPOINT=<COS_ENDPOINT>
   ```
3. With the configmap defined, you can now update the job by asking Code Engine to set environment variables in the runtime of the job based on the values in the configmap. Update the job with the following command:
   ```console
     $ ibmcloud code-engine job update --name vir-scan --env-from-configmap virus-scan-configuration
   ```
