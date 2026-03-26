import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentRegNumber, newAllocationId, newRoomPrice } = body;

    if (!studentRegNumber || !newAllocationId || !newRoomPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const payments = await Payment.find({ studentRegNumber }).lean();

    const matchingPayment = payments.find(payment =>
      payment.status === 'Approved' &&
      payment.amount === newRoomPrice
    );

    if (matchingPayment) {
      await Payment.findByIdAndUpdate(matchingPayment._id, { allocation: newAllocationId });
      await Allocation.findByIdAndUpdate(newAllocationId, { paymentStatus: 'Paid', paymentId: matchingPayment._id });

      return NextResponse.json({
        updated: true,
        message: `Payment automatically linked to new room allocation`
      });
    }

    return NextResponse.json({
      updated: false,
      message: 'No matching payment found to auto-update'
    });
  } catch (error) {
    console.error("Error auto-updating payment allocation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
