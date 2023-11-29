const aws =require("aws-sdk");
const {Storage}=require('@google-cloud/storage')
const fetch=require('node-fetch');
aws.config.update({ region: "us-east-1" });
const docClient = new aws.DynamoDB.DocumentClient();
const apiKey = process.env.apiKey;
const domain = 'demo.sumeetdeshpande.me';
const host="demo.sumeetdeshpande.me";
const mailgun = require('mailgun-js')({
    apiKey: apiKey,
    domain: domain,
  });



exports.handler = async function (event) {

    const seconds = 5 * 60;
    const secondsInEpoch = Math.round(Date.now() / 1000);
    const expirationTime = secondsInEpoch + seconds;
  
      console.log(event);


      const message = event.Records[0].Sns.Message
      const parsedMessage = JSON.parse(message)
      console.log('Parsed message:', parsedMessage)
      const email = parsedMessage.email
      const { submission_url, user_id, assignment_id } = parsedMessage

 
      const downloadUrl = 'https://github.com/tparikh/myrepo/archive/refs/tags/v1.0.0.zip';
    
   
    console.log("Send email",email,submission_url,user_id,assignment_id);
    try {
        const response = await fetch(submission_url); 

        if (!response.ok) {
            await recordEmailEvent("failure");
            const emailData = {
                from: "no-reply@demo.sumeetdeshpande.me",
                to:  email,
                subject: 'Download Failed',
                text: 'Your file has been failed uploaded to the GCP Bucket'
              };
            await sendEmail(mailgun, emailData);
            return "file not uploaed";
          }
          else{
            await recordEmailEvent("success");
        
          
     
        console.log("Sending Email");
        const bucketName=process.env.gcsBucket;
        const gcpServiceAccountKeyFile = Buffer.from(process.env.gcp_pk, 'base64').toString('utf-8');;
        const gcpCredentials = JSON.parse(gcpServiceAccountKeyFile);
       
        const storage = new Storage({
          projectId: process.env.projectId,
          credentials: gcpCredentials, 
      });
      const folderPath = `${user_id}/${assignment_id}`;
      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
      const filename=`${folderPath}/my-file-${timestamp}.zip`;
        await uploadFileToGCS(bucketName,filename,response.body,parsedMessage);
        const signedurl=await generateSignedUrl(storage,bucketName,filename);
        const emailData = {
          from: "no-reply@demo.sumeetdeshpande.me",
          to: email,
          subject: 'Download Success',
          text: `Your file has been uploaded to GCP Bucket successfully. ${signedurl}`
        };
        await sendEmail(mailgun, emailData);
        return "file  uploaed";
          }
      } catch (error) {
        console.error('Error:', error);
        await recordEmailEvent("failure");
        const emailData = {
            from: "no-reply@demo.sumeetdeshpande.me",
            to: email,
            subject: 'Download Failed',
            text: 'Your file has been failed uploaded to GCP Bucket'
          };
        await sendEmail(mailgun, emailData);
        return "file not uploaed";
      }

      finally{
        return{
          status:200
        }
      }
  
   
  };


async function sendEmail(mailgun, data) {
    return new Promise((resolve, reject) => {
      mailgun.messages().send(data, (error, body) => {
        if (error) {
          reject(error);
        
        } else {
          resolve(body);
        }
      });
    });
}


async function generateSignedUrl(storage, bucketName, fileName) {
  const options = {
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };
 
  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(fileName)
      .getSignedUrl(options);
    return url;
  } catch (err) {
    console.error("Error generating signed URL:", err);
    throw err;
  }
}

async function uploadFileToGCS(bucketName, fileName, stream,parsedMessage) {
    const email = parsedMessage.email
      const { submission_url, user_id, assignment_id } = parsedMessage
    const folderPath = `${user_id}/${assignment_id}`;
    const gcpServiceAccountKeyFile = Buffer.from(process.env.gcp_pk, 'base64').toString('utf-8');;
    const gcpCredentials = JSON.parse(gcpServiceAccountKeyFile);
   
    
    const storage = new Storage({
      projectId: process.env.projectId,
      credentials: gcpCredentials, 
  });
  
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
    const file = storage.bucket(bucketName).file(fileName);
    const writeStream = file.createWriteStream();
  
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream)
        .on('error', reject)
        .on('finish', () => {
          console.log(`File ${fileName} uploaded to ${bucketName}.`);
          resolve();
        });
    });
  }

async function recordEmailEvent(status) {
    const params = {
      TableName: process.env.dbName,
      Item: {
        id: Date.now().toString(),
        status: status,
        timestamp: new Date().toISOString(),
      },
    };
   
    await docClient.put(params).promise();
  }









// async function sendEmail() {
//     try {
//       await mailgun.messages().send(getMessage(), function (error, body) {
//         if(error) console.log(error)
//         else console.log(body);
//       });
//     } catch (error) {
//       console.error('Error sending test email');
//       console.error(error);
//       if (error.response) {
//         console.error(error.response.body)
//       }
//     }
// }






// const AWS = require("aws-sdk");
// const { Storage } = require("@google-cloud/storage");
// const fetch = require("node-fetch");
// const mailgun = require("mailgun-js");
// const dynamoDB = new AWS.DynamoDB.DocumentClient();
// const DOMAIN = "demo.shobhitsrivas.me";
// const mg = mailgun({
//   apiKey: "b5e10512881b9cc8d36303e5a4c77a68-5d2b1caa-3bc69fb2",
//   domain: DOMAIN,
// });
 
// exports.handler = async function handler(event) {
//   try {
//     console.log("EVENT SNS", event.Records[0].Sns);
//     console.log("EVENT", event);
//     const eventData = JSON.parse(event.Records[0].Sns.Message);
//     const releaseUrl = eventData.releaseUrl;
//     const recipientEmail = eventData.email;
 
//     console.log("URL:", releaseUrl);
//     console.log("EMAIL:", recipientEmail);
 
//     const response = await fetch(releaseUrl);
//     if (!response.ok)
//       throw new Error(`Failed to download release: ${response.statusText}`);
 
//     const releaseData = await response.buffer();
 
//     /*   const storage = new Storage();
//     const bucketName = process.env.GCS_BUCKET_NAME;
//     const fileName = "path/to/release/file";
//     await storage.bucket(bucketName).file(fileName).save(releaseData); */
 
//     await sendEmail(
//       recipientEmail,
//       "Download successful",
//       `The release was successfully downloaded and uploaded to ${bucketName}`
//     );
 
//     await recordEmailEvent("success");
//   } catch (error) {
//     console.error("Error:", error);
 
//     await sendEmail(
//       event.email,
//       "Download failed",
//       `Error occurred: ${error.message}`
//     );
 
//     await recordEmailEvent("failure");
//   }
// };
 
// async function sendEmail(to, subject, message) {
//   const data = {
//     from: "noreply@demo.shobhitsrivas.me",
//     to: "shobhitcse0710@gmail.com",
//     subject: subject,
//     text: message,
//   };
 
//   await mg.messages().send(data);
// }
 
// async function recordEmailEvent(status) {
//   const params = {
//     TableName: process.env.DYNAMODB_TABLE_NAME,
//     Item: {
//       id: Date.now().toString(),
//       status: status,
//       timestamp: new Date().toISOString(),
//     },
//   };
 
//   await dynamoDB.put(params).promise();
// }