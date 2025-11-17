const DatabaseInitializer = require('../src/config/database-init');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize complete database with default admin
    await DatabaseInitializer.initializeCompleteDatabase();
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Default Admin Credentials:');
    console.log('   Email: crecocommunication@gmail.com');
    console.log('   Password: 12345678');
    console.log('   Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;