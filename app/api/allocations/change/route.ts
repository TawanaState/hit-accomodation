import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";
import { Allocation } from "@/models/Allocation";
import { Session } from "@/models/Session";
import mongoose from "mongoose";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentRegNumber, newRoomId, newHostelId, studentGender, isAdminAction } = await req.json();

    if (!studentRegNumber || !newRoomId || !newHostelId) {
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
      // 1. Get current allocation
      const currentAllocation = await Allocation.findOne({
        studentRegNumber,
        session: activeSession._id,
      }).session(mongooseSession);

      if (!currentAllocation) {
        throw new Error("No existing allocation found for this student");
      }

      const currentRoomId = currentAllocation.room.toString();
      const currentHostelId = currentAllocation.hostel.toString();

      if (!isAdminAction && currentHostelId !== newHostelId) {
        throw new Error("Students can only change rooms within the same hostel");
      }

      if (currentRoomId === newRoomId) {
        throw new Error("Cannot move to the same room");
      }

      // 2. Validate current hostel
      const currentHostel = await Hostel.findById(currentHostelId).session(mongooseSession);
      if (!currentHostel) {
        throw new Error("Current hostel not found");
      }

      // 3. Validate new hostel
      const newHostel = await Hostel.findById(newHostelId).session(mongooseSession);
      if (!newHostel) {
        throw new Error("Target hostel not found");
      }

      if (currentHostel.pricePerSemester !== newHostel.pricePerSemester) {
         throw new Error("Cannot change rooms with different prices.");
      }

      // 4. Validate new room
      const newRoom = await Room.findById(newRoomId).session(mongooseSession);
      if (!newRoom) {
        throw new Error("Target room not found");
      }

      if (!newRoom.isAvailable || newRoom.occupants.length >= newRoom.capacity || newRoom.isReserved) {
        throw new Error("Target room is not available");
      }

      if (newRoom.gender !== 'Mixed' && newRoom.gender !== studentGender) {
        throw new Error("Room gender does not match student gender");
      }

      // 5. Update old room
      const oldRoom = await Room.findById(currentRoomId).session(mongooseSession);
      if (oldRoom) {
        oldRoom.occupants = oldRoom.occupants.filter(reg => reg !== studentRegNumber);
        oldRoom.isAvailable = true;
        await oldRoom.save({ session: mongooseSession });
      }

      // 6. Update new room
      newRoom.occupants.push(studentRegNumber);
      if (newRoom.occupants.length >= newRoom.capacity) {
        newRoom.isAvailable = false;
      }
      await newRoom.save({ session: mongooseSession });

      // 7. Update hostel occupancies if cross-hostel (admin only)
      if (currentHostelId !== newHostelId) {
         currentHostel.currentOccupancy = Math.max(0, currentHostel.currentOccupancy - 1);
         await currentHostel.save({ session: mongooseSession });

         newHostel.currentOccupancy += 1;
         await newHostel.save({ session: mongooseSession });
      }

      // 8. Update Allocation document
      currentAllocation.room = new mongoose.Types.ObjectId(newRoomId);
      currentAllocation.hostel = new mongoose.Types.ObjectId(newHostelId);
      currentAllocation.allocatedAt = new Date();
      await currentAllocation.save({ session: mongooseSession });

      // Commit transaction
      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      return NextResponse.json(currentAllocation);
    } catch (transactionError: any) {
      // Abort transaction on error
      await mongooseSession.abortTransaction();
      mongooseSession.endSession();
      console.error("Transaction Error:", transactionError.message);
      return NextResponse.json(
        { error: transactionError.message || "Room change failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error changing room allocation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
