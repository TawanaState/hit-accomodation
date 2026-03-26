import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { newAllocationId } = body;

    if (!newAllocationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const newAllocation = await Allocation.findById(newAllocationId);
    if (!newAllocation) {
      return NextResponse.json({ error: "New allocation not found" }, { status: 404 });
    }

    const payments = await Payment.updateMany({ allocation: id }, { allocation: newAllocationId });

    return NextResponse.json({ message: `Updated ${payments.modifiedCount} payment record(s)` });
  } catch (error) {
    console.error("Error updating payment allocation reference:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
