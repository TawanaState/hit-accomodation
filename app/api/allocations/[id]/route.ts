import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Allocation } from "@/models/Allocation";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";
import { Session } from "@/models/Session";
import mongoose from "mongoose";

// GET an allocation by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const allocation = await Allocation.findById(params.id)
      .populate("room")
      .populate("hostel")
      .populate("session");

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json(allocation);
  } catch (error) {
    console.error("Error fetching allocation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE an allocation (Revoke)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      const allocation = await Allocation.findById(params.id).session(mongooseSession);
      if (!allocation) {
        throw new Error("Allocation not found");
      }

      // Remove occupant from room
      const room = await Room.findById(allocation.room).session(mongooseSession);
      if (room) {
        room.occupants = room.occupants.filter(
          (reg) => reg !== allocation.studentRegNumber
        );
        room.isAvailable = room.occupants.length < room.capacity;
        await room.save({ session: mongooseSession });
      }

      // Decrease hostel occupancy
      const hostel = await Hostel.findById(allocation.hostel).session(mongooseSession);
      if (hostel) {
        hostel.currentOccupancy = Math.max(0, hostel.currentOccupancy - 1);
        await hostel.save({ session: mongooseSession });
      }

      await Allocation.findByIdAndDelete(params.id).session(mongooseSession);

      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      return NextResponse.json({ message: "Allocation revoked successfully" });
    } catch (transactionError: any) {
      await mongooseSession.abortTransaction();
      mongooseSession.endSession();
      console.error("Transaction Error:", transactionError.message);
      return NextResponse.json(
        { error: transactionError.message || "Failed to revoke allocation" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error revoking allocation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT to change an allocation (Room Change)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newRoomId, newHostelId, studentGender, isAdminAction } = await req.json();

    if (!newRoomId || !newHostelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();
    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      const currentAllocation = await Allocation.findById(params.id).session(mongooseSession);
      if (!currentAllocation) {
        throw new Error("Allocation not found");
      }

      if (currentAllocation.room.toString() === newRoomId) {
        throw new Error("Cannot move to the same room");
      }

      // For students, ensure they can only change within the same hostel
      if (!isAdminAction && currentAllocation.hostel.toString() !== newHostelId) {
        throw new Error("Students can only change rooms within the same hostel");
      }

      // Fetch new hostel and room
      const newHostel = await Hostel.findById(newHostelId).session(mongooseSession);
      if (!newHostel) {
        throw new Error("Target hostel not found");
      }

      const newRoom = await Room.findById(newRoomId).session(mongooseSession);
      if (!newRoom || newRoom.hostel.toString() !== newHostelId) {
        throw new Error("Target room not found in the specified hostel");
      }

      if (!newRoom.isAvailable || newRoom.occupants.length >= newRoom.capacity) {
        throw new Error("Target room is not available");
      }

      if (newRoom.gender !== "Mixed" && newRoom.gender !== studentGender) {
        throw new Error("Room gender does not match student gender");
      }

      const currentHostel = await Hostel.findById(currentAllocation.hostel).session(mongooseSession);
      if (!currentHostel) {
        throw new Error("Current hostel not found");
      }

      // Check price compatibility
      if (!isAdminAction && currentHostel.pricePerSemester !== newHostel.pricePerSemester) {
        throw new Error(`Cannot change rooms with different prices.`);
      }

      // Remove from old room
      const oldRoom = await Room.findById(currentAllocation.room).session(mongooseSession);
      if (oldRoom) {
        oldRoom.occupants = oldRoom.occupants.filter(
          (reg) => reg !== currentAllocation.studentRegNumber
        );
        oldRoom.isAvailable = oldRoom.occupants.length < oldRoom.capacity;
        await oldRoom.save({ session: mongooseSession });
      }

      // Add to new room
      newRoom.occupants.push(currentAllocation.studentRegNumber);
      newRoom.isAvailable = newRoom.occupants.length < newRoom.capacity;
      await newRoom.save({ session: mongooseSession });

      // If hostel changed, update occupancy
      if (currentAllocation.hostel.toString() !== newHostelId) {
        currentHostel.currentOccupancy = Math.max(0, currentHostel.currentOccupancy - 1);
        await currentHostel.save({ session: mongooseSession });

        newHostel.currentOccupancy += 1;
        await newHostel.save({ session: mongooseSession });
      }

      // Update allocation
      currentAllocation.room = newRoomId;
      currentAllocation.hostel = newHostelId;
      currentAllocation.allocatedAt = new Date();
      await currentAllocation.save({ session: mongooseSession });

      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      return NextResponse.json(currentAllocation);
    } catch (transactionError: any) {
      await mongooseSession.abortTransaction();
      mongooseSession.endSession();
      console.error("Transaction Error:", transactionError.message);
      return NextResponse.json(
        { error: transactionError.message || "Failed to change room" },
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
