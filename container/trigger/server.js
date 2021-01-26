"use strict";

const myCOS = require("ibm-cos-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const express = require("express");
const { spawnSync } = require( 'child_process' );
const app = express();
const { v1: uuidv1 } = require('uuid');

const path = require("path");
require("dotenv").config({
  silent: true
});

const cors = require("cors");
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;
var counter = 0

/*
 * Default route for the web app
 */
app.get("/stats", function (req, res, next) {
  res.send("Hello World! from backend: Counter " + counter);
});


/**
* Listens for COS Action
 */
app.post("/events/cos",function (req, res, next){
  try {
    var event = req.body
    if (event) {
       const source_bucket = event['bucket']
       const source_object = event['key']
       const id = uuidv1(); 

       console.log("Triggered");
      console.log("Executing login...");
      const ibm = spawnSync( 'ibmcloud', [ 'login', '--apikey', process.env.API_KEY ] );

      console.log( `stderr: ${ibm.stderr.toString()}` );
      console.log( `stdout: ${ibm.stdout.toString()}` );
      console.log("Executing target...");
      const ibm2 = spawnSync( 'ibmcloud', [ 'target', '-g', 'default', '-r', 'us-south' ] );

      console.log( `stderr: ${ibm2.stderr.toString()}` );
      console.log( `stdout: ${ibm2.stdout.toString()}` );

      // const ibm3 = spawnSync( 'ibmcloud', [ 'target', '-r', 'us-south' ] );

      // console.log( `stderr: ${ibm3.stderr.toString()}` );
      // console.log( `stdout: ${ibm3.stdout.toString()}` );
      
      console.log("Executing project...");
      const ibm4 = spawnSync( 'ibmcloud', [ 'ce', 'project', 'select', '-n', 'vir_scan'] );

      console.log( `stderr: ${ibm4.stderr.toString()}` );
      console.log( `stdout: ${ibm4.stdout.toString()}` );
      
      console.log("Executing jobrun...");
      const ibm5 = spawnSync( 'ibmcloud', [ 'ce', 'jobrun', 'submit' , '-n', `jobrun-vir-scan-${id}`, '--job', 'vir-scan', '-e', `COS_BUCKET_ENTRY=${source_bucket}`,'-e', `COS_FILE=${source_object}` ] );

      console.log( `stderr: ${ibm5.stderr.toString()}` );
      console.log( `stdout: ${ibm5.stdout.toString()}` );
      return 'OK'
    }
   
   

    
  } catch (error) {
    // Passes errors into the error handler
    return next(error);
  }
});

// error handler middleware
app.use((error, req, res, next) => {
  console.log(error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.status || 500).send({
    error: {
      status: error.status || 500,
      message: error.message || "Internal Server error",
    },
  });
});

app.listen(port, () => console.log(`App listening on port ${port}!`));
