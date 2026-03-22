import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Allocation } from "@/models/Allocation";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const allocations = await Allocation.find().lean();

    const formattedAllocations = allocations.map((allocation) => ({
      id: allocation._id.toString(),
      studentRegNumber: allocation.studentRegNumber,
      roomId: allocation.room.toString(),
      hostelId: allocation.hostel.toString(),
      sessionId: allocation.session.toString(),
      allocatedAt: allocation.allocatedAt,
      paymentStatus: allocation.paymentStatus,
      paymentDeadline: allocation.paymentDeadline,
      semester: allocation.semester,
      academicYear: allocation.academicYear,
      paymentId: allocation.paymentId?.toString()
    }));

    return NextResponse.json(formattedAllocations);
  } catch (error) {
    console.error("Error fetching all allocations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
