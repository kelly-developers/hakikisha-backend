const crypto = require('crypto');
const logger = require('./logger');

class Encryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY || this.generateKey(), 'hex');
    this.ivLength = 16;
    this.authTagLength = 16;
  }

  generateKey() {
    // Generate a random key (32 bytes for AES-256)
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated new encryption key. Set ENCRYPTION_KEY environment variable for consistency.');
    return key;
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
      
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedText) {
    try {
      // Extract IV, auth tag, and encrypted data
      const iv = Buffer.from(encryptedText.substring(0, this.ivLength * 2), 'hex');
      const authTag = Buffer.from(
        encryptedText.substring(this.ivLength * 2, this.ivLength * 2 + this.authTagLength * 2), 
        'hex'
      );
      const encrypted = encryptedText.substring(this.ivLength * 2 + this.authTagLength * 2);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed - possibly invalid key or corrupted data');
    }
  }

  hash(data, algorithm = 'sha256') {
    try {
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Hashing failed:', error);
      throw new Error('Hashing failed');
    }
  }

  hmac(data, secret) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      logger.error('HMAC calculation failed:', error);
      throw new Error('HMAC calculation failed');
    }
  }

  generateSalt(length = 16) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Salt generation failed:', error);
      throw new Error('Salt generation failed');
    }
  }

  hashPassword(password, salt = null) {
    try {
      const actualSalt = salt || this.generateSalt();
      const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512');
      return {
        hash: hash.toString('hex'),
        salt: actualSalt
      };
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  verifyPassword(password, hash, salt) {
    try {
      const newHash = this.hashPassword(password, salt);
      return newHash.hash === hash;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  generateToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      return { publicKey, privateKey };
    } catch (error) {
      logger.error('Key pair generation failed:', error);
      throw new Error('Key pair generation failed');
    }
  }

  signData(data, privateKey) {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      return sign.sign(privateKey, 'hex');
    } catch (error) {
      logger.error('Data signing failed:', error);
      throw new Error('Data signing failed');
    }
  }

  verifySignature(data, signature, publicKey) {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      return verify.verify(publicKey, signature, 'hex');
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  encryptSymmetric(data, password) {
    try {
      const salt = crypto.randomBytes(16);
      const key = crypto.scryptSync(password, salt, 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return salt.toString('hex') + iv.toString('hex') + encrypted;
    } catch (error) {
      logger.error('Symmetric encryption failed:', error);
      throw new Error('Symmetric encryption failed');
    }
  }

  decryptSymmetric(encryptedData, password) {
    try {
      const salt = Buffer.from(encryptedData.substring(0, 32), 'hex');
      const iv = Buffer.from(encryptedData.substring(32, 64), 'hex');
      const encrypted = encryptedData.substring(64);
      
      const key = crypto.scryptSync(password, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Symmetric decryption failed:', error);
      throw new Error('Symmetric decryption failed');
    }
  }

  generateCSRFToken() {
    try {
      return crypto.randomBytes(32).toString('hex');
    } catch (error) {
      logger.error('CSRF token generation failed:', error);
      throw new Error('CSRF token generation failed');
    }
  }

  validateCSRFToken(token, storedToken) {
    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
    } catch (error) {
      logger.error('CSRF token validation failed:', error);
      return false;
    }
  }

  // File encryption utilities
  encryptFile(buffer) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      logger.error('File encryption failed:', error);
      throw new Error('File encryption failed');
    }
  }

  decryptFile(encryptedBuffer) {
    try {
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const authTag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.authTagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
      logger.error('File decryption failed:', error);
      throw new Error('File decryption failed');
    }
  }

  // Utility methods for key management
  exportKey() {
    return this.key.toString('hex');
  }

  importKey(keyHex) {
    this.key = Buffer.from(keyHex, 'hex');
  }

  // Security audit methods
  getSecurityInfo() {
    return {
      algorithm: this.algorithm,
      key_length: this.key.length * 8, // Convert bytes to bits
      iv_length: this.ivLength,
      auth_tag_length: this.authTagLength,
      supported_algorithms: crypto.getCiphers()
    };
  }

  // Performance testing
  benchmarkEncryption(dataSize = 1024) {
    const testData = crypto.randomBytes(dataSize).toString('hex');
    const startTime = process.hrtime();
    
    this.encrypt(testData);
    
    const endTime = process.hrtime(startTime);
    const duration = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    return {
      data_size: dataSize,
      duration_ms: duration,
      throughput: (dataSize / (duration / 1000)).toFixed(2) + ' bytes/second'
    };
  }
}

module.exports = new Encryption();