import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Allocation } from "@/models/Allocation";
import { Session } from "@/models/Session";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentRegNumber = searchParams.get("studentRegNumber");

    if (!studentRegNumber) {
      return NextResponse.json(
        { error: "studentRegNumber is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the active session
    const activeSession = await Session.findOne({ isActive: true });

    let sessionFilter = {};
    if (activeSession) {
      sessionFilter = { session: activeSession._id };
    }

    // Find allocations for the student
    const allocations = await Allocation.find({
      studentRegNumber,
      ...sessionFilter
    })
      .sort({ allocatedAt: -1 })
      .lean();

    // Map the relational data to the nested structure expected by the UI.
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
    console.error("Error fetching allocations:", error);
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

    const { studentRegNumber, roomId, hostelId } = await req.json();

    if (!studentRegNumber || !roomId || !hostelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the active session
    const activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 400 }
      );
    }

    // Start a transaction
    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      // 1. Check if the student already has an allocation in the current session
      const existingAllocation = await Allocation.findOne({
        studentRegNumber,
        session: activeSession._id,
      }).session(mongooseSession);

      if (existingAllocation) {
        throw new Error("Student already has an allocation for this session");
      }

      // 2. Fetch and check room availability
      const room = await Room.findById(roomId).session(mongooseSession);
      if (!room) {
        throw new Error("Room not found");
      }

      if (
        !room.isAvailable ||
        room.occupants.length >= room.capacity ||
        room.isReserved
      ) {
        throw new Error("Room is full or unavailable");
      }

      // 3. Fetch Hostel to update current occupancy
      const hostel = await Hostel.findById(hostelId).session(mongooseSession);
      if (!hostel) {
        throw new Error("Hostel not found");
      }

      // 4. Update room occupants and availability
      room.occupants.push(studentRegNumber);
      if (room.occupants.length >= room.capacity) {
        room.isAvailable = false;
      }
      await room.save({ session: mongooseSession });

      // 5. Update hostel occupancy
      hostel.currentOccupancy += 1;
      await hostel.save({ session: mongooseSession });

      // 6. Create the Allocation document
      const paymentGracePeriodDays = 7; // Usually fetched from settings, default 7 days
      const paymentDeadline = new Date(
        Date.now() + paymentGracePeriodDays * 24 * 60 * 60 * 1000
      );

      const academicYear = activeSession.name;
      // We can infer semester from the session code or date, assuming Semester 1 for now or fetching from session metadata.
      const semester = "Semester 1";

      const [newAllocation] = await Allocation.create(
        [
          {
            studentRegNumber,
            room: roomId,
            hostel: hostelId,
            session: activeSession._id,
            allocatedAt: new Date(),
            paymentStatus: "Pending",
            paymentDeadline,
            semester,
            academicYear,
          },
        ],
        { session: mongooseSession }
      );

      // Commit transaction
      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      return NextResponse.json({
        id: newAllocation._id.toString(),
        studentRegNumber: newAllocation.studentRegNumber,
        roomId: newAllocation.room.toString(),
        hostelId: newAllocation.hostel.toString(),
        sessionId: newAllocation.session.toString(),
        allocatedAt: newAllocation.allocatedAt,
        paymentStatus: newAllocation.paymentStatus,
        paymentDeadline: newAllocation.paymentDeadline,
        semester: newAllocation.semester,
        academicYear: newAllocation.academicYear,
      });
    } catch (transactionError: any) {
      // Abort transaction on error
      await mongooseSession.abortTransaction();
      mongooseSession.endSession();
      console.error("Transaction Error:", transactionError.message);
      return NextResponse.json(
        { error: transactionError.message || "Allocation failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating allocation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
