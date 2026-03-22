import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Allocation } from "@/models/Allocation";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";

// Mocking settings since there's no Settings model in MongoDB yet
const getHostelSettings = async () => {
  return {
    paymentGracePeriod: 168, // 168 hours = 7 days
    autoRevokeUnpaidAllocations: true,
  };
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.PAYMENT_CHECK_TOKEN || 'default-secure-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.warn('Unauthorized payment deadline check attempt');
      return NextResponse.json({ 
        message: "Unauthorized",
        error: 'Invalid or missing authorization token'
      }, { status: 401 });
    }

    await dbConnect();
    const settings = await getHostelSettings();
    
    if (!settings.autoRevokeUnpaidAllocations) {
      return NextResponse.json({ 
        message: "Auto-revoke is disabled",
        revokedCount: 0 
      }, { status: 200 });
    }

    const now = new Date();
    
    const unpaidAllocations = await Allocation.find({
      paymentStatus: { $in: ["Pending", "Overdue"] }
    });

    const expiredAllocations = [];
    
    for (const allocation of unpaidAllocations) {
      const deadlineDate = new Date(allocation.paymentDeadline);
      deadlineDate.setHours(deadlineDate.getHours() + settings.paymentGracePeriod);
      
      if (now > deadlineDate) {
        expiredAllocations.push(allocation);
      }
    }

    console.log(`Found ${expiredAllocations.length} expired allocations to revoke`);
    
    const results = await Promise.all(expiredAllocations.map(async (allocation) => {
      try {
        // Revoke logic
        const room = await Room.findById(allocation.room);
        if (room) {
          room.occupants = room.occupants.filter(reg => reg !== allocation.studentRegNumber);
          room.isAvailable = true; // since it was revoked, it's open again
          await room.save();

          const hostel = await Hostel.findById(allocation.hostel);
          if (hostel) {
            hostel.currentOccupancy = Math.max(0, hostel.currentOccupancy - 1);
            await hostel.save();
          }
        }

        await Allocation.findByIdAndDelete(allocation._id);

        console.log(`Revoked allocation ${allocation._id} for student ${allocation.studentRegNumber}`);

        return {
          allocationId: allocation._id,
          studentRegNumber: allocation.studentRegNumber,
          success: true
        };
      } catch (error) {
        console.error(`Failed to revoke allocation ${allocation._id}:`, error);
        return {
          allocationId: allocation._id,
          studentRegNumber: allocation.studentRegNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }));
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      message: `Payment deadline check completed`,
      totalExpired: expiredAllocations.length,
      revokedCount: successCount,
      failureCount: failureCount,
      results: results
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error checking payment deadlines:", error);
    return NextResponse.json({ 
      message: "Failed to check payment deadlines",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const settings = await getHostelSettings();
    const now = new Date();
    
    const unpaidAllocations = await Allocation.find({
      paymentStatus: { $in: ["Pending", "Overdue"] }
    });

    const expiredAllocations = [];
    
    for (const allocation of unpaidAllocations) {
      const deadlineDate = new Date(allocation.paymentDeadline);
      const gracePeriodEnd = new Date(deadlineDate);
      gracePeriodEnd.setHours(gracePeriodEnd.getHours() + settings.paymentGracePeriod);
      
      if (now > gracePeriodEnd) {
        const hoursOverdue = Math.floor((now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60));
        expiredAllocations.push({
          id: allocation._id,
          studentRegNumber: allocation.studentRegNumber,
          paymentDeadline: allocation.paymentDeadline,
          hoursOverdue: hoursOverdue
        });
      }
    }
    
    return NextResponse.json({
      autoRevokeEnabled: settings.autoRevokeUnpaidAllocations,
      paymentGracePeriod: settings.paymentGracePeriod,
      totalUnpaidAllocations: unpaidAllocations.length,
      expiredAllocations: expiredAllocations.length,
      expiredDetails: expiredAllocations
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error checking payment deadline status:", error);
    return NextResponse.json({ 
      message: "Failed to check payment deadline status",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
