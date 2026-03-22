'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchStudentAllocations } from '@/data/hostel-data';
import { toast } from 'react-toastify';

import { useSession } from "next-auth/react";

export const useStudentAllocation = (hostels: any[]) => {
  const { data: session } = useSession();
  const [existingAllocation, setExistingAllocation] = useState<any>(null);
  const [allocationRoomDetails, setAllocationRoomDetails] = useState<any>(null);
  const [allocationChecked, setAllocationChecked] = useState(false);

  const checkExistingAllocation = useCallback(async () => {
    if (!session?.user?.email) return;

    const email = session.user.email;
    const emailDomain = email.split("@")[1] || "";
    let regNumber = "";

    try {
      if (emailDomain === "hit.ac.zw") {
        regNumber = email.split("@")[0] || "";
      } else if (emailDomain === "gmail.com") {
        const res = await fetch(`/api/students/by-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const userData = await res.json();
          regNumber = userData.regNumber || "";
        } else {
          console.log("User not found in database");
          return;
        }
      } else {
        console.log("Unsupported email domain");
        return;
      }

      if (regNumber) {
        const allocations = await fetchStudentAllocations(regNumber);
        if (allocations.length > 0) {
          const allocation = allocations[0];
          setExistingAllocation(allocation);
          
          // Find room details in hostels
          const hostel = hostels.find(h => h.id === allocation.hostelId);
          if (hostel) {
            let roomDetails = null;
            hostel.floors.forEach((floor: any) => {
              floor.rooms.forEach((room: any) => {
                if (room.id === allocation.roomId) {
                  roomDetails = {
                    ...room,
                    hostelName: hostel.name,
                    floorName: floor.name
                  };
                }
              });
            });
            setAllocationRoomDetails(roomDetails);
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing allocation:", error);
    }
  }, [hostels, session]);

  useEffect(() => {
    if (hostels.length > 0 && !allocationChecked && session?.user?.email) {
      setAllocationChecked(true);
      checkExistingAllocation();
    }
  }, [hostels, allocationChecked, checkExistingAllocation, session]);

  return {
    existingAllocation,
    allocationRoomDetails,
    checkExistingAllocation
  };
};

export default useStudentAllocation;
