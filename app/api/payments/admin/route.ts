import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { payment, adminEmail } = body;
    const { allocationId, studentRegNumber, receiptNumber, amount, paymentMethod, notes, attachments } = payment;

    if (!allocationId || !studentRegNumber || !receiptNumber || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const allocation = await Allocation.findById(allocationId);
    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    const newPayment = new Payment({
      studentRegNumber,
      allocation: allocationId,
      session: allocation.session, // Use the allocation's session
      receiptNumber,
      amount,
      paymentMethod,
      notes,
      attachments: attachments || [],
      status: 'Approved',
      approvedBy: adminEmail,
      approvedAt: new Date(),
      submittedAt: new Date()
    });

    await newPayment.save();

    allocation.paymentStatus = 'Paid';
    allocation.paymentId = newPayment._id;
    await allocation.save();

    return NextResponse.json({ id: newPayment._id.toString() }, { status: 201 });
  } catch (error) {
    console.error("Error adding admin payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
