require('dotenv/config');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;


const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey
})

function uploadFile(file){
    const filestream = fs.createReadStream(file.path)

    const uploadParams = {
        Bucket: bucketName,
        Body: filestream,
        key: file.filename
        
    }

    return s3.upload(uploadParams).promise();
}

exports.uploadFile = uploadFile


function getFileStream(fileKey){
    const downloadParams={
        key: fileKey,
        Bucket: bucketName
    }
    return s3.getObject(downloadParams).createReadStream();
}

exports.getFileStream = getFileStream