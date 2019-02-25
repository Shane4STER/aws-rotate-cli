#!/usr/bin/env node

const AWS = require('aws-sdk');
const homedir = require('os').homedir;
const fs = require('fs').promises;
const path = require('path');
const replace = require('replace-in-file');

const IAM = new AWS.IAM({apiVersion: '2010-05-08'});

const credentialsFile = new AWS.SharedIniFileCredentials();
const credentialsFileLocation = process.env.AWS_SHARED_CREDENTIALS_FILE || `${homedir()}/.aws/credentials`;

let originalAccessKey = credentialsFile.accessKeyId;
let updatedCredentials;

IAM.createAccessKey({}).promise().then((newCredentials) => {
  console.log('Created new AccessKey');
  updatedCredentials = newCredentials.AccessKey;
  console.log('Attempting to deactivate the old key with the new key');
  return IAM.updateAccessKey({AccessKeyId: originalAccessKey, Status: "Inactive"}).promise();
}).then(response => {
  console.log('done');
  console.log('updating shared config');
  return replace({
    files: credentialsFileLocation,
    from: [ originalAccessKey, credentialsFile.secretAccessKey ],
    to: [ updatedCredentials.AccessKeyId, updatedCredentials.SecretAccessKey ]
  });
}).then(changes => {
  console.log('done');
  return credentialsFile.refreshPromise();
}).then(() => {
  console.log('Deleting old access key');
  return IAM.deleteAccessKey({AccessKeyId: originalAccessKey}).promise();
}).then(response => {
  console.log('Success');
}).catch(err => {
  console.log(err);
});
