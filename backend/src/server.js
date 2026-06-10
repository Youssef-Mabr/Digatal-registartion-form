require('dotenv').config();

const bcrypt = require('bcrypt');
const app = require('./app');
const { connectDatabase } = require('./config/db');
const { configureCloudinary } = require('./config/cloudinary');
const Admin = require('./models/Admin');

async function seedDefaultAdmin() {
  const username = 'hispeedcity';
  const password = 'Hispeedcity2026@';
  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.deleteMany({ username: { $ne: username } });

  const existingAdmin = await Admin.findOneAndUpdate(
    { username },
    { username, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Seeded default admin account for ${existingAdmin.username}`);
}

async function bootstrap() {
  await connectDatabase(process.env.MONGODB_URI);
  configureCloudinary();
  await seedDefaultAdmin();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Hi Speed City backend running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
