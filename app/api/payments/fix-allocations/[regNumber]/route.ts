import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";

export async function POST(
  req: NextRequest,
  { params }: { params: { regNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { regNumber } = params;

    await dbConnect();

    const payments = await Payment.find({ studentRegNumber: regNumber }).lean();
    const allocations = await Allocation.find({ studentRegNumber: regNumber }).lean();

    const unpaidAllocations = allocations.filter(a => a.paymentStatus !== 'Paid');
    const approvedPayments = payments.filter(p => p.status === 'Approved');

    let fixedCount = 0;

    for (const allocation of unpaidAllocations) {
      const hostel = await Hostel.findById(allocation.hostel).lean();
      if (!hostel) continue;
      const roomDetails = { price: hostel.pricePerSemester };

      if (!roomDetails) continue;

      const matchingPayment = approvedPayments.find(payment =>
        payment.amount === roomDetails.price &&
        payment.allocation.toString() !== allocation._id.toString()
      );

      if (matchingPayment) {
        await Payment.findByIdAndUpdate(matchingPayment._id, { allocation: allocation._id });
        await Allocation.findByIdAndUpdate(allocation._id, { paymentStatus: 'Paid', paymentId: matchingPayment._id });
        fixedCount++;
      }
    }

    return NextResponse.json({
      fixed: fixedCount,
      message: fixedCount > 0
        ? `Successfully fixed ${fixedCount} allocation payment(s) for student ${regNumber}`
        : `No matching payments found to fix for student ${regNumber}`
    });
  } catch (error) {
    console.error("Error fixing allocation payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
