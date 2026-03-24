import mongoose from 'mongoose';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { Hostel } from '../models/Hostel';
import { Room } from '../models/Room';
import { Application } from '../models/Application';
import { Allocation } from '../models/Allocation';
import { Payment } from '../models/Payment';

const MONGODB_URI = 'mongodb://localhost:27017/rez-portal-test';

async function runSeed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing existing data...');
    await Promise.all([
      Session.deleteMany({}),
      User.deleteMany({}),
      Hostel.deleteMany({}),
      Room.deleteMany({}),
      Application.deleteMany({}),
      Allocation.deleteMany({}),
      Payment.deleteMany({}),
    ]);
    console.log('Data cleared.');

    // 1. Create a Session
    const session = await Session.create({
      name: 'Academic Year 2024/2025',
      code: '24-25',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2025-06-30'),
      isActive: true,
      isOpenForApplications: true,
    });
    console.log('Created Session:', session.name);

    // 2. Create a User
    const user = await User.create({
      email: 'testuser@hit.ac.zw',
      displayName: 'Test User',
      role: 'user',
    });
    console.log('Created User:', user.email);

    // 3. Create a Hostel
    const hostel = await Hostel.create({
      name: 'Block A',
      description: 'Male Hostel',
      totalCapacity: 100,
      gender: 'Male',
      pricePerSemester: 500,
      floors: [
        { name: 'Ground Floor', number: '0' },
        { name: 'First Floor', number: '1' },
      ],
    });
    console.log('Created Hostel:', hostel.name);

    // 4. Create a Room
    const room = await Room.create({
      number: 'A-0-01',
      hostel: hostel._id,
      floor: hostel.floors[0]._id, // Reference the generated floor _id
      price: 500,
      capacity: 2,
      gender: 'Male',
      isAvailable: true,
    });
    console.log('Created Room:', room.number);

    // 5. Create an Application
    const application = await Application.create({
      regNumber: 'HIT1234',
      session: session._id,
      status: 'Pending',
      reference: 'APP-123456',
    });
    console.log('Created Application for:', application.regNumber);

    // 6. Create an Allocation
    const allocation = await Allocation.create({
      studentRegNumber: 'HIT1234',
      room: room._id,
      hostel: hostel._id,
      session: session._id,
      paymentDeadline: new Date('2024-09-01'),
      semester: '1',
      academicYear: '2024',
    });
    console.log('Created Allocation for:', allocation.studentRegNumber);

    // 7. Create a Payment
    const payment = await Payment.create({
      studentRegNumber: 'HIT1234',
      allocation: allocation._id,
      session: session._id,
      receiptNumber: 'RCPT-001',
      amount: 500,
      paymentMethod: 'Bank Transfer',
    });
    console.log('Created Payment:', payment.receiptNumber);

    console.log('Validation Test: Missing Required Field...');
    try {
      await Room.create({
        // Missing number
        hostel: hostel._id,
        floor: hostel.floors[0]._id,
        price: 500,
        capacity: 2,
        gender: 'Male',
      });
      console.error('FAILED: Validation should have caught missing required fields');
    } catch (err: any) {
      console.log('SUCCESS: Validation caught missing required field:', err.message);
    }

    console.log('Seed and validation successful!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runSeed();
