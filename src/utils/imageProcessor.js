const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

class ImageProcessor {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async validateImage(fileBuffer, filename) {
    try {
      // Check file size
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error(`File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Check file format
      const extension = path.extname(filename).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(extension)) {
        throw new Error(`Unsupported image format. Supported: ${this.supportedFormats.join(', ')}`);
      }

      // Validate image integrity
      const metadata = await sharp(fileBuffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
      }

      return {
        valid: true,
        metadata: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      logger.error('Image validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async resizeImage(fileBuffer, options = {}) {
    try {
      const {
        width = 800,
        height = 600,
        fit = 'inside',
        withoutEnlargement = true
      } = options;

      const resizedBuffer = await sharp(fileBuffer)
        .resize(width, height, {
          fit,
          withoutEnlargement
        })
        .toBuffer();

      const originalMetadata = await sharp(fileBuffer).metadata();
      const resizedMetadata = await sharp(resizedBuffer).metadata();

      logger.debug('Image resized successfully', {
        original: `${originalMetadata.width}x${originalMetadata.height}`,
        resized: `${resizedMetadata.width}x${resizedMetadata.height}`,
        sizeReduction: `${((fileBuffer.length - resizedBuffer.length) / fileBuffer.length * 100).toFixed(1)}%`
      });

      return {
        success: true,
        buffer: resizedBuffer,
        metadata: resizedMetadata,
        originalSize: fileBuffer.length,
        newSize: resizedBuffer.length
      };

    } catch (error) {
      logger.error('Image resize failed:', error);
      throw new Error('Image resize failed');
    }
  }

  async compressImage(fileBuffer, options = {}) {
    try {
      const {
        quality = 80,
        format = 'jpeg',
        progressive = true
      } = options;

      let sharpInstance = sharp(fileBuffer);

      // Set format-specific options
      const formatOptions = {};
      
      if (format === 'jpeg' || format === 'jpg') {
        formatOptions.quality = quality;
        formatOptions.progressive = progressive;
        formatOptions.mozjpeg = true;
      } else if (format === 'png') {
        formatOptions.quality = quality;
        formatOptions.compressionLevel = 9;
        formatOptions.palette = true;
      } else if (format === 'webp') {
        formatOptions.quality = quality;
        formatOptions.lossless = quality === 100;
      }

      const compressedBuffer = await sharpInstance
        [format]?.(formatOptions)
        .toBuffer();

      const compressionRatio = (fileBuffer.length - compressedBuffer.length) / fileBuffer.length * 100;

      logger.debug('Image compressed successfully', {
        format,
        quality,
        originalSize: fileBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: `${compressionRatio.toFixed(1)}%`
      });

      return {
        success: true,
        buffer: compressedBuffer,
        format,
        quality,
        compressionRatio,
        originalSize: fileBuffer.length,
        newSize: compressedBuffer.length
      };

    } catch (error) {
      logger.error('Image compression failed:', error);
      throw new Error('Image compression failed');
    }
  }

  async generateThumbnail(fileBuffer, size = 200) {
    try {
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();

      logger.debug('Thumbnail generated successfully', {
        size: `${metadata.width}x${metadata.height}`,
        format: metadata.format
      });

      return {
        success: true,
        buffer: thumbnailBuffer,
        width: metadata.width,
        height: metadata.height,
        size: thumbnailBuffer.length
      };

    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw new Error('Thumbnail generation failed');
    }
  }

  async convertFormat(fileBuffer, targetFormat) {
    try {
      if (!this.supportedFormats.includes(targetFormat.toLowerCase())) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      const convertedBuffer = await sharp(fileBuffer)
        [targetFormat]()
        .toBuffer();

      const originalMetadata = await sharp(fileBuffer).metadata();
      const convertedMetadata = await sharp(convertedBuffer).metadata();

      logger.debug('Image format converted successfully', {
        from: originalMetadata.format,
        to: convertedMetadata.format,
        originalSize: fileBuffer.length,
        newSize: convertedBuffer.length
      });

      return {
        success: true,
        buffer: convertedBuffer,
        originalFormat: originalMetadata.format,
        targetFormat: convertedMetadata.format
      };

    } catch (error) {
      logger.error('Image format conversion failed:', error);
      throw new Error('Image format conversion failed');
    }
  }

  async applyWatermark(imageBuffer, watermarkBuffer, options = {}) {
    try {
      const {
        position = 'southeast',
        opacity = 0.7,
        margin = 10
      } = options;

      const image = sharp(imageBuffer);
      const imageMetadata = await image.metadata();

      // Resize watermark to appropriate size (max 20% of image width)
      const maxWatermarkWidth = imageMetadata.width * 0.2;
      const watermark = sharp(watermarkBuffer)
        .resize(maxWatermarkWidth, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .composite([{
          input: await watermarkBuffer,
          blend: 'over',
          opacity: opacity
        }]);

      const watermarkMetadata = await watermark.metadata();

      // Calculate position
      const positionCoords = this.calculateWatermarkPosition(
        position,
        imageMetadata.width,
        imageMetadata.height,
        watermarkMetadata.width,
        watermarkMetadata.height,
        margin
      );

      const watermarkedBuffer = await image
        .composite([{
          input: await watermark.png().toBuffer(),
          top: positionCoords.y,
          left: positionCoords.x
        }])
        .toBuffer();

      logger.debug('Watermark applied successfully', {
        position,
        opacity,
        watermarkSize: `${watermarkMetadata.width}x${watermarkMetadata.height}`
      });

      return {
        success: true,
        buffer: watermarkedBuffer,
        watermarkPosition: position,
        watermarkSize: {
          width: watermarkMetadata.width,
          height: watermarkMetadata.height
        }
      };

    } catch (error) {
      logger.error('Watermark application failed:', error);
      throw new Error('Watermark application failed');
    }
  }

  calculateWatermarkPosition(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight, margin) {
    const positions = {
      'top-left': { x: margin, y: margin },
      'top-center': { x: (imageWidth - watermarkWidth) / 2, y: margin },
      'top-right': { x: imageWidth - watermarkWidth - margin, y: margin },
      'center-left': { x: margin, y: (imageHeight - watermarkHeight) / 2 },
      'center': { x: (imageWidth - watermarkWidth) / 2, y: (imageHeight - watermarkHeight) / 2 },
      'center-right': { x: imageWidth - watermarkWidth - margin, y: (imageHeight - watermarkHeight) / 2 },
      'bottom-left': { x: margin, y: imageHeight - watermarkHeight - margin },
      'bottom-center': { x: (imageWidth - watermarkWidth) / 2, y: imageHeight - watermarkHeight - margin },
      'bottom-right': { x: imageWidth - watermarkWidth - margin, y: imageHeight - watermarkHeight - margin },
      'southeast': { x: imageWidth - watermarkWidth - margin, y: imageHeight - watermarkHeight - margin }
    };

    return positions[position] || positions['southeast'];
  }

  async extractMetadata(fileBuffer) {
    try {
      const metadata = await sharp(fileBuffer).metadata();
      
      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        space: metadata.space,
        depth: metadata.depth
      };

    } catch (error) {
      logger.error('Metadata extraction failed:', error);
      throw new Error('Metadata extraction failed');
    }
  }

  async createImageGrid(images, options = {}) {
    try {
      const {
        columns = 3,
        spacing = 10,
        backgroundColor = '#FFFFFF'
      } = options;

      if (!images || images.length === 0) {
        throw new Error('No images provided for grid');
      }

      // Resize all images to the same size
      const cellSize = 200; // Default cell size
      const resizedImages = await Promise.all(
        images.map(async (imgBuffer) => {
          return await this.resizeImage(imgBuffer, {
            width: cellSize,
            height: cellSize,
            fit: 'cover'
          });
        })
      );

      // Calculate grid dimensions
      const rows = Math.ceil(images.length / columns);
      const gridWidth = columns * cellSize + (columns - 1) * spacing;
      const gridHeight = rows * cellSize + (rows - 1) * spacing;

      // Create base image for the grid
      let grid = sharp({
        create: {
          width: gridWidth,
          height: gridHeight,
          channels: 3,
          background: backgroundColor
        }
      });

      // Composite images into grid
      const composites = [];
      resizedImages.forEach((resized, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        const x = col * (cellSize + spacing);
        const y = row * (cellSize + spacing);

        composites.push({
          input: resized.buffer,
          top: y,
          left: x
        });
      });

      const gridBuffer = await grid
        .composite(composites)
        .jpeg({ quality: 90 })
        .toBuffer();

      logger.debug('Image grid created successfully', {
        images: images.length,
        gridSize: `${gridWidth}x${gridHeight}`,
        columns,
        rows
      });

      return {
        success: true,
        buffer: gridBuffer,
        gridSize: { width: gridWidth, height: gridHeight },
        cellSize,
        imagesProcessed: images.length
      };

    } catch (error) {
      logger.error('Image grid creation failed:', error);
      throw new Error('Image grid creation failed');
    }
  }

  async optimizeForWeb(fileBuffer, options = {}) {
    try {
      const {
        maxWidth = 1200,
        quality = 75,
        format = 'webp'
      } = options;

      // Resize if necessary
      const metadata = await sharp(fileBuffer).metadata();
      let optimizedBuffer = fileBuffer;

      if (metadata.width > maxWidth) {
        const resized = await this.resizeImage(fileBuffer, {
          width: maxWidth,
          height: null,
          fit: 'inside'
        });
        optimizedBuffer = resized.buffer;
      }

      // Compress
      const compressed = await this.compressImage(optimizedBuffer, {
        quality,
        format
      });

      logger.debug('Image optimized for web', {
        originalSize: fileBuffer.length,
        optimizedSize: compressed.newSize,
        reduction: `${((fileBuffer.length - compressed.newSize) / fileBuffer.length * 100).toFixed(1)}%`,
        format: compressed.format
      });

      return compressed;

    } catch (error) {
      logger.error('Web optimization failed:', error);
      throw new Error('Web optimization failed');
    }
  }

  async batchProcessImages(images, processFn, concurrency = 5) {
    try {
      const results = [];
      const batches = [];

      // Split images into batches
      for (let i = 0; i < images.length; i += concurrency) {
        batches.push(images.slice(i, i + concurrency));
      }

      // Process batches sequentially
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(async (image, index) => {
            try {
              return await processFn(image);
            } catch (error) {
              logger.error(`Batch processing failed for image ${index}:`, error);
              return {
                success: false,
                error: error.message,
                index
              };
            }
          })
        );

        results.push(...batchResults);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('Batch image processing completed', {
        total: images.length,
        successful,
        failed
      });

      return {
        results,
        summary: {
          total: images.length,
          successful,
          failed
        }
      };

    } catch (error) {
      logger.error('Batch image processing failed:', error);
      throw new Error('Batch image processing failed');
    }
  }

  // Utility methods
  getSupportedFormats() {
    return this.supportedFormats;
  }

  async getFileSize(fileBuffer) {
    return fileBuffer.length;
  }

  async getDominantColor(fileBuffer) {
    try {
      const { dominant } = await sharp(fileBuffer)
        .resize(1, 1)
        .raw()
        .toBuffer({ resolveWithObject: true });

      return `rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})`;
    } catch (error) {
      logger.error('Dominant color extraction failed:', error);
      return null;
    }
  }
}

module.exports = new ImageProcessor();