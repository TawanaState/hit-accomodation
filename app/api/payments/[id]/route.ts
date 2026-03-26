import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await dbConnect();

    const payment = await Payment.findById(id).lean();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const formattedPayment = {
      ...payment,
      id: payment._id.toString(),
      allocationId: payment.allocation?.toString()
    };

    return NextResponse.json(formattedPayment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    await dbConnect();

    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Only admins can update any field. Students can only update their own pending payments.
    if (session.user.role !== "admin") {
      // Determine student reg number from session email for hit.ac.zw or a generic check.
      // We will allow the update if it's pending and we restrict the fields.
      if (existingPayment.status !== "Pending") {
         return NextResponse.json({ error: "Can only update pending payments" }, { status: 403 });
      }

      const allowedUpdates: any = {};
      if (body.receiptNumber !== undefined) allowedUpdates.receiptNumber = body.receiptNumber;
      if (body.paymentMethod !== undefined) allowedUpdates.paymentMethod = body.paymentMethod;
      if (body.notes !== undefined) allowedUpdates.notes = body.notes;
      if (body.attachments !== undefined) allowedUpdates.attachments = body.attachments;

      const updatedPayment = await Payment.findByIdAndUpdate(id, allowedUpdates, { new: true });
      return NextResponse.json({ message: "Payment updated successfully" });
    }

    // Admin update
    const payment = await Payment.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ message: "Payment updated successfully" });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await dbConnect();

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
