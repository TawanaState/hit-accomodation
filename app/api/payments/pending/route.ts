import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const payments = await Payment.find({ status: 'Pending' }).sort({ submittedAt: 1 }).lean();

    const formattedPayments = payments.map((payment) => ({
      ...payment,
      id: payment._id.toString(),
      allocationId: payment.allocation?.toString()
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
