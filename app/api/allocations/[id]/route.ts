import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Allocation } from "@/models/Allocation";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;

    const allocation = await Allocation.findById(id).lean();

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error fetching allocation by ID:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const updatedAllocation = await Allocation.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updatedAllocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    console.error("Error updating allocation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;

    const deletedAllocation = await Allocation.findByIdAndDelete(id).lean();
    if (!deletedAllocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Allocation deleted successfully" });
  } catch (error) {
    console.error("Error deleting allocation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
