import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { adminEmail, rejectionReason } = await req.json();

    if (!rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    await dbConnect();

    const payment = await Payment.findById(id);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    payment.status = 'Rejected';
    payment.approvedBy = adminEmail;
    payment.approvedAt = new Date();
    payment.rejectionReason = rejectionReason;
    await payment.save();

    return NextResponse.json({ message: "Payment rejected successfully" });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
