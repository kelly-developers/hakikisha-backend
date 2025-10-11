const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cloudService = require('./cloudService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class FileUploadService {
  constructor() {
    this.initializeMulter();
  }

  initializeMulter() {
    // Memory storage for processing before cloud upload
    this.storage = multer.memoryStorage();
    
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: Constants.MAX_FILE_SIZE,
        files: 5 // Maximum number of files
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  fileFilter(req, file, cb) {
    try {
      // Validate file type
      if (!cloudService.validateFileType(file.originalname)) {
        return cb(new Error('Invalid file type. Allowed types: ' + 
          ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov'].join(', ')));
      }

      // Validate file size
      if (file.size > Constants.MAX_FILE_SIZE) {
        return cb(new Error(`File size must be less than ${Constants.MAX_FILE_SIZE / 1024 / 1024}MB`));
      }

      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }

  async uploadFile(file, folder = 'general') {
    try {
      const { originalname, buffer, mimetype, size } = file;

      // Generate unique filename
      const fileExtension = path.extname(originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;

      // Upload to cloud storage
      const uploadResult = await cloudService.uploadFile(
        buffer, 
        uniqueFilename, 
        folder
      );

      // Log the upload
      logger.info('File uploaded successfully', {
        originalName: originalname,
        uploadedName: uniqueFilename,
        size: size,
        folder: folder,
        url: uploadResult.url
      });

      return {
        success: true,
        file: {
          original_name: originalname,
          stored_name: uniqueFilename,
          url: uploadResult.url,
          cloudfront_url: uploadResult.cloudfrontUrl,
          size: size,
          mime_type: mimetype,
          uploaded_at: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('File upload failed:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async uploadMultipleFiles(files, folder = 'general') {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder));
      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = [];
      const failedUploads = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value.file);
        } else {
          failedUploads.push({
            original_name: files[index].originalname,
            error: result.reason.message
          });
        }
      });

      return {
        successful: successfulUploads,
        failed: failedUploads,
        total_attempted: files.length,
        successful_count: successfulUploads.length,
        failed_count: failedUploads.length
      };

    } catch (error) {
      logger.error('Multiple files upload failed:', error);
      throw error;
    }
  }

  async deleteFile(fileKey) {
    try {
      await cloudService.deleteFile(fileKey);
      
      logger.info('File deleted successfully', { fileKey });

      return { success: true, message: 'File deleted successfully' };

    } catch (error) {
      logger.error('File deletion failed:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async generatePresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const url = await cloudService.generatePresignedUrl(fileKey, expiresIn);
      
      return {
        success: true,
        url: url,
        expires_in: expiresIn,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
      };

    } catch (error) {
      logger.error('Presigned URL generation failed:', error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  async getFileInfo(fileKey) {
    try {
      // This would typically involve checking cloud storage metadata
      // For now, return basic info
      return {
        exists: true,
        key: fileKey,
        last_modified: new Date().toISOString(),
        size: 0, // Would be fetched from cloud storage
        content_type: this.getContentType(fileKey)
      };

    } catch (error) {
      logger.error('File info retrieval failed:', error);
      throw error;
    }
  }

  async validateFile(file) {
    const validations = [];

    // Size validation
    if (file.size > Constants.MAX_FILE_SIZE) {
      validations.push({
        type: 'size',
        valid: false,
        message: `File size exceeds limit of ${Constants.MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    } else {
      validations.push({
        type: 'size',
        valid: true,
        message: 'File size is within limits'
      });
    }

    // Type validation
    if (!cloudService.validateFileType(file.originalname)) {
      validations.push({
        type: 'type',
        valid: false,
        message: 'File type not allowed'
      });
    } else {
      validations.push({
        type: 'type',
        valid: true,
        message: 'File type is allowed'
      });
    }

    // Virus scan simulation (would integrate with actual virus scanning service)
    const virusScanResult = await this.scanForViruses(file.buffer);
    validations.push(virusScanResult);

    const allValid = validations.every(v => v.valid);

    return {
      valid: allValid,
      validations: validations,
      file_name: file.originalname,
      file_size: file.size
    };
  }

  async scanForViruses(fileBuffer) {
    try {
      // This would integrate with a virus scanning service like ClamAV
      // For now, simulate a scan
      const hasVirus = Math.random() < 0.001; // 0.1% chance for simulation

      if (hasVirus) {
        return {
          type: 'virus',
          valid: false,
          message: 'File contains potential security threats'
        };
      }

      return {
        type: 'virus',
        valid: true,
        message: 'File is clean'
      };

    } catch (error) {
      logger.error('Virus scan failed:', error);
      return {
        type: 'virus',
        valid: false,
        message: 'Virus scan failed'
      };
    }
  }

  getContentType(filename) {
    const extension = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  async compressImage(buffer, quality = 80) {
    try {
      // This would integrate with an image compression library like sharp
      // For now, return the original buffer
      logger.debug('Image compression placeholder', { quality });
      return buffer;

    } catch (error) {
      logger.error('Image compression failed:', error);
      return buffer; // Return original if compression fails
    }
  }

  async generateThumbnail(buffer, width = 200, height = 200) {
    try {
      // This would generate a thumbnail using an image processing library
      // For now, return a placeholder
      logger.debug('Thumbnail generation placeholder', { width, height });
      return buffer;

    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      return null;
    }
  }

  async getStorageUsage() {
    try {
      // This would calculate total storage usage from cloud storage
      // For now, return placeholder data
      return {
        total_used: 0,
        file_count: 0,
        by_type: {
          images: 0,
          documents: 0,
          videos: 0
        },
        last_calculated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Storage usage calculation failed:', error);
      throw error;
    }
  }

  async cleanupOrphanedFiles() {
    try {
      // This would find and delete files that are no longer referenced in the database
      const orphanedFiles = await this.findOrphanedFiles();
      
      const deletionResults = await Promise.allSettled(
        orphanedFiles.map(file => this.deleteFile(file.key))
      );

      const successfulDeletions = deletionResults.filter(r => r.status === 'fulfilled').length;

      logger.info('Orphaned files cleanup completed', {
        total_orphaned: orphanedFiles.length,
        successful_deletions: successfulDeletions,
        failed_deletions: deletionResults.length - successfulDeletions
      });

      return {
        total_orphaned: orphanedFiles.length,
        successful_deletions: successfulDeletions,
        failed_deletions: deletionResults.length - successfulDeletions
      };

    } catch (error) {
      logger.error('Orphaned files cleanup failed:', error);
      throw error;
    }
  }

  async findOrphanedFiles() {
    // This would compare files in cloud storage with database references
    // For now, return empty array
    return [];
  }

  // Middleware for handling file uploads
  getUploadMiddleware(fieldName, maxCount = 1) {
    if (maxCount > 1) {
      return this.upload.array(fieldName, maxCount);
    }
    return this.upload.single(fieldName);
  }

  handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `File too large. Maximum size is ${Constants.MAX_FILE_SIZE / 1024 / 1024}MB`
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files uploaded'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'Unexpected field name for file upload'
        });
      }
    }

    // For other errors
    return res.status(400).json({
      error: error.message
    });
  }
}

module.exports = new FileUploadService();