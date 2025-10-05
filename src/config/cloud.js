const AWS = require('aws-sdk');
const logger = require('../utils/logger');

class CloudService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    this.cloudFront = new AWS.CloudFront({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }

  async uploadFile(fileBuffer, fileName, folder = 'uploads') {
    try {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${folder}/${Date.now()}-${fileName}`,
        Body: fileBuffer,
        ACL: 'public-read',
        ContentType: this.getContentType(fileName)
      };

      const result = await this.s3.upload(params).promise();
      
      logger.info(`File uploaded successfully: ${result.Key}`);
      return {
        url: result.Location,
        key: result.Key,
        cloudfrontUrl: `${process.env.CLOUDFRONT_DISTRIBUTION}/${result.Key}`
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error('File upload failed');
    }
  }

  async deleteFile(fileKey) {
    try {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey
      };

      await this.s3.deleteObject(params).promise();
      logger.info(`File deleted successfully: ${fileKey}`);
      return true;
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new Error('File deletion failed');
    }
  }

  async generatePresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Presigned URL generation error:', error);
      throw new Error('URL generation failed');
    }
  }

  async listFiles(prefix = '', maxKeys = 100) {
    try {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('S3 list files error:', error);
      throw new Error('File listing failed');
    }
  }

  getContentType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  validateFileSize(fileBuffer, maxSize = process.env.MAX_FILE_SIZE) {
    return fileBuffer.length <= maxSize;
  }

  validateFileType(fileName, allowedTypes = ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov']) {
    const extension = fileName.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  }
}

module.exports = new CloudService();