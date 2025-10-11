const logger = require('./logger');
const Constants = require('../config/constants');

class Helpers {
  // Date and Time Utilities
  formatDate(date, format = 'standard') {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const formats = {
      standard: d.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      }),
      full: d.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit' 
      }),
      iso: d.toISOString(),
      relative: this.getRelativeTime(d)
    };

    return formats[format] || formats.standard;
  }

  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return this.formatDate(date, 'standard');
  }

  // String Utilities
  truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  sanitizeHtml(html) {
    if (!html) return '';
    
    // Basic HTML sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
  }

  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  // Number Utilities
  formatNumber(number) {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  }

  formatPercentage(decimal, decimals = 1) {
    return (decimal * 100).toFixed(decimals) + '%';
  }

  // Array and Object Utilities
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  // Validation Utilities
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  // File Utilities
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(filename) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExtensions.includes(this.getFileExtension(filename));
  }

  isVideoFile(filename) {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    return videoExtensions.includes(this.getFileExtension(filename));
  }

  // API Response Utilities
  createSuccessResponse(data = null, message = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  createErrorResponse(message = 'Error', code = null, details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (code) response.code = code;
    if (details) response.details = details;

    return response;
  }

  createPaginatedResponse(data, pagination) {
    return {
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString()
    };
  }

  // Performance Utilities
  async measurePerformance(fn, context = 'operation') {
    const start = process.hrtime();
    
    try {
      const result = await fn();
      const end = process.hrtime(start);
      const duration = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
      
      logger.debug(`Performance measurement: ${context}`, {
        duration: `${duration}ms`,
        context
      });
      
      return {
        result,
        duration: parseFloat(duration)
      };
    } catch (error) {
      const end = process.hrtime(start);
      const duration = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
      
      logger.error(`Performance measurement failed: ${context}`, {
        duration: `${duration}ms`,
        error: error.message,
        context
      });
      
      throw error;
    }
  }

  // Security Utilities
  generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const masked = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    }
    
    return masked;
  }

  // Logging Utilities
  logOperation(operation, data, level = 'info') {
    const logData = {
      operation,
      ...this.maskSensitiveData(data),
      timestamp: new Date().toISOString()
    };

    logger[level](`Operation: ${operation}`, logData);
  }

  // Configuration Utilities
  getConfigValue(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  // Math Utilities
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Promise Utilities
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Operation attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await this.sleep(delay * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  // URL Utilities
  addQueryParams(url, params) {
    const urlObj = new URL(url);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.set(key, value.toString());
      }
    });
    
    return urlObj.toString();
  }

  getQueryParams(url) {
    const urlObj = new URL(url);
    const params = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }
}

module.exports = new Helpers();