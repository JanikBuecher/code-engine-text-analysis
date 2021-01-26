"use strict";
const myCOS = require("ibm-cos-sdk");
const mv = require('mv');
require("dotenv").config({
  silent: true,
});
const fs = require("fs");
var config = {
    endpoint:
      process.env.COS_ENDPOINT ||
      "s3.us-south.cloud-object-storage.appdomain.cloud",
    apiKeyId: process.env.COS_JOB_APIKEY,
    ibmAuthEndpoint: "https://iam.cloud.ibm.com/identity/token",
    serviceInstanceId: "crn:v1:bluemix:public:cloud-object-storage:global:a/26247a9e0b3a8c78d5d2867054fd0c6f:397aa18a-951c-4e18-9a9d-912c700aec19:bucket:entry3-bucket",
  };
var cosClient = new myCOS.S3(config);
const NodeClam = require('clamscan');
const options = {
  remove_infected: false, // Removes files if they are infected
  quarantine_infected: '/usr/src/app', // Move file here. remove_infected must be FALSE, though.
  debug_mode: true, // This will put some debug info in your js console
  scan_recursively: true, // Choosing false here will save some CPU cycles
  clamscan: {
      path: '/usr/bin/clamscan', // I dunno, maybe your clamscan is just call "clam"
      scan_archives: false, // Choosing false here will save some CPU cyclese
      active: true // you don't want to use this at all because it's evil
  },
  clamdscan: {
    socket: false, // Socket file for connecting via TCP
    host: false, // IP of host to connect to TCP interface
    port: false, // Port of host to use when connecting via TCP interface
    local_fallback: true,
},
  preference: 'clamscan'
}




app()


async function app() {

  // getting the file from COS and writing the file to the disk for scanning 
  await getItem(process.env.COS_BUCKET_ENTRY, process.env.COS_FILE)
  
  fs.readdirSync('./data/').forEach(file => {
      scan('./data/', file);
  })
  
}

/**
 * Get an Item from a COS Bucket
 *
 * @param {*} bucketName
 * @param {*} itemName
 * @return {*}
 */
function getItem(bucketName, itemName) {
  return new Promise((resolve, reject) => {
    console.log(`Retrieving item from bucket: ${bucketName}, key: ${itemName}`);
    return cosClient
      .getObject({
        Bucket: bucketName,
        Key: itemName,
      })
      .promise()
      .then((data) => {
        if (data != null) {
          // writing the file to the disk for scanning
          fs.writeFileSync(`./data/${itemName}`, data.Body);
          console.log("saving item...")
          resolve()
        }
      })
      .catch((e) => {
        console.error(`ERROR: ${e.code} - ${e.message}\n`);
      });
  })
  
}



async function scan(folder, filename) {
  
  try {
    
      // Get instance by resolving ClamScan promise object
      const clamscan = await new NodeClam().init(options);
      const data = fs.readFileSync(folder + filename, {encoding:'utf8', flag:'r'}); 
      const {is_infected, file, viruses} = await clamscan.is_infected(folder + filename);
      // debug log
      console.log(`Is infected: ${is_infected}`);
      

      // moving the file to the right Bucket (currently disabled)

      // await doDeleteObject(process.env.COS_BUCKET_ENTRY, filename)
      
      // if (is_infected){
      //   await doCreateObject(process.env.COS_BUCKET_DIRTY, filename, data)
      // }else if (!is_infected){
      //   await doCreateObject(process.env.COS_BUCKET_CLEAN, filename, data)
      // }

      // deleting file from disk
      fs.unlinkSync(folder+ filename);
      
  } catch (err) {
      console.log(err)
  }
}


async function doDeleteObject(bucketname, filename) {
  return new Promise(resolve => {
    console.log('Deleting object');
    return cosClient.deleteObject({
        Bucket: bucketname,
        Key: filename
    }).promise(resolve());
    
  })

}

async function doCreateObject(bucketname, filename, data) {
  return new Promise(resolve => {
    console.log('Creating object');
    return cosClient.putObject({
        Bucket: bucketname,
        Key: filename,
        Body: data
    }).promise(resolve());
  })
  
}