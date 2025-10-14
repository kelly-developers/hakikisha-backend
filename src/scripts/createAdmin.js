const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Creates default admin user with 2FA enabled
 * Run this script once during initial deployment
 */
async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin...');

    // Check if admin already exists
    const existingAdmin = await db.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    console.log('👤 Creating admin user...');

    // Admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hakikisha.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#Change';
    const adminId = uuidv4();

    // Hash password
    const password_hash = await bcrypt.hash(adminPassword, 10);

    // Generate 2FA secret
    const twoFactorSecret = speakeasy.generateSecret({
      name: `HAKIKISHA (${adminEmail})`,
      issuer: 'HAKIKISHA'
    });

    // Create admin user
    await db.query(
      `INSERT INTO users (
        id, email, password_hash, role, is_verified, 
        registration_status, two_factor_enabled, two_factor_secret,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, 'admin', true, 'approved', true, $4, NOW(), NOW())`,
      [adminId, adminEmail, password_hash, twoFactorSecret.base32]
    );

    // Generate QR code for 2FA setup
    const qrCodeUrl = await QRCode.toDataURL(twoFactorSecret.otpauth_url);

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📧 Admin Credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('\n🔐 Two-Factor Authentication:');
    console.log('   Secret:', twoFactorSecret.base32);
    console.log('\n📱 2FA Setup:');
    console.log('   1. Download Google Authenticator or Authy app');
    console.log('   2. Scan this QR code (save the image):');
    console.log('   QR Code URL:', qrCodeUrl);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Change the admin password immediately after first login');
    console.log('   - Store the 2FA secret securely');
    console.log('   - Never commit these credentials to version control\n');

    // Save QR code to file (optional)
    const fs = require('fs');
    const qrCodeBase64 = qrCodeUrl.split(',')[1];
    fs.writeFileSync('admin-2fa-qr.png', qrCodeBase64, 'base64');
    console.log('💾 QR code saved to: admin-2fa-qr.png\n');

    return {
      adminId,
      adminEmail,
      twoFactorSecret: twoFactorSecret.base32,
      qrCodeUrl
    };
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Admin creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin creation failed:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;
