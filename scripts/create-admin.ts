import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * This script creates an admin role with all permissions and an admin user
 */
async function main() {
  console.log('🚀 Starting admin setup script...');
  
  try {
    // Define all permissions that should be available in the system
    const permissionNames = [
      "Create Users", "Edit Users", "Delete Users",
      "Create Roles", "Edit Roles", "Delete Roles",
      "Create Permissions", "Edit Permissions", "Delete Permissions",
      "Create Test", "Edit Test", "Delete Test",
      "Create MCQ", "Edit MCQ", "Delete MCQ", "Upload MCQs",
      "View Dashboard", "View Enrollments", "View Attempts",
      "Create Courses", "Edit Courses", "Delete Courses",
      "Approve Reviews", "Reject Reviews", "View Reviews"
    ];
    
    console.log('⚙️ Creating permissions...');
    // Create all permissions if they don't exist
    for (const name of permissionNames) {
      await prisma.permission.upsert({
        where: { name },
        update: {},
        create: {
          name,
        },
      });
    }
    console.log('✅ Permissions created successfully');
    
    // Create admin role if it doesn't exist
    console.log('⚙️ Creating admin role...');
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
      },
    });
    console.log('✅ Admin role created successfully');
    
    // Get all permissions and connect them to admin role
    console.log('⚙️ Attaching permissions to admin role...');
    const permissions = await prisma.permission.findMany();
    
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: permissions.map(p => ({ id: p.id })),
        },
      },
    });
    console.log('✅ Permissions attached to admin role successfully');
    
    // Create admin user if it doesn't exist
    console.log('⚙️ Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.upsert({
      where: { email: 'admin@pdu.com' },
      update: {
        role: {
          connect: { id: adminRole.id }
        }
      },
      create: {
        name: 'Admin',
        email: 'admin@pdu.com',
        password: hashedPassword,
        role: {
          connect: { id: adminRole.id }
        }
      },
    });
    console.log('✅ Admin user created successfully');
    
    console.log('✅ ALL DONE! Admin setup complete.');
    console.log('🔑 Admin email: admin@pdu.com');
    console.log('🔑 Admin password: admin123');
    
  } catch (error) {
    console.error('❌ Error during admin setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 