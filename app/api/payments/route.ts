import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch all payments
    const payments = await Payment.find().sort({ submittedAt: -1 }).lean();

    const formattedPayments = payments.map((payment) => ({
      ...payment,
      id: payment._id.toString(),
      allocationId: payment.allocation?.toString()
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { allocationId, studentRegNumber, receiptNumber, amount, paymentMethod, notes, attachments } = body;

    if (!allocationId || !studentRegNumber || !receiptNumber || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const allocation = await Allocation.findById(allocationId);
    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    const payment = new Payment({
      studentRegNumber,
      allocation: allocationId,
      session: allocation.session, // Use the allocation's session
      receiptNumber,
      amount,
      paymentMethod,
      notes,
      attachments: attachments || [],
      status: 'Pending',
      submittedAt: new Date()
    });

    await payment.save();

    return NextResponse.json({ id: payment._id.toString() }, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
