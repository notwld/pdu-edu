import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'admin@pdu.com';
  const newPassword = 'okok123123';

  console.log(`Resetting password for ${targetEmail} ...`);

  const user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    console.error(`User with email ${targetEmail} not found.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email: targetEmail }, data: { password: hashed } });

  console.log('✅ Password reset successful.');
}

main()
  .catch((err) => {
    console.error('Error resetting password:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


