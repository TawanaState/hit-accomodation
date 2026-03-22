import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";

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
    const { adminEmail } = await req.json();

    await dbConnect();

    const payment = await Payment.findById(id);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    payment.status = 'Approved';
    payment.approvedBy = adminEmail;
    payment.approvedAt = new Date();
    await payment.save();

    const allocation = await Allocation.findById(payment.allocation);
    if (allocation) {
      allocation.paymentStatus = 'Paid';
      allocation.paymentId = payment._id;
      await allocation.save();
    }

    return NextResponse.json({ message: "Payment approved successfully" });
  } catch (error) {
    console.error("Error approving payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
