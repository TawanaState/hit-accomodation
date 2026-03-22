'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

export const useStudentAllocation = (hostels: any[]) => {
  const { data: session } = useSession();
  const [existingAllocation, setExistingAllocation] = useState<any>(null);
  const [allocationRoomDetails, setAllocationRoomDetails] = useState<any>(null);
  const [allocationChecked, setAllocationChecked] = useState(false);

  const checkExistingAllocation = useCallback(async () => {
    if (!session?.user?.email) return;

    const emailDomain = session.user.email.split("@")[1] || "";
    let regNumber = "";

    try {
      if (emailDomain === "hit.ac.zw") {
        regNumber = session.user.email.split("@")[0] || "";
      } else if (emailDomain === "gmail.com") {
        // Query the API endpoint for student profile to get regNumber
        const response = await fetch(`/api/students?email=${session.user.email}`);
        if (response.ok) {
           const studentData = await response.json();
           if (studentData && studentData.regNumber) {
              regNumber = studentData.regNumber;
           } else {
              console.log("User not found in database");
              return;
           }
        } else {
           console.log("Failed to fetch user database");
           return;
        }
      } else {
        console.log("Unsupported email domain");
        return;
      }

      if (regNumber) {
        const res = await fetch(`/api/allocations?studentRegNumber=${regNumber}`);
        if (res.ok) {
          const allocations = await res.json();
          if (allocations.length > 0) {
            const allocation = allocations[0];
            setExistingAllocation(allocation);

            // Find room details in hostels
            const hostel = hostels.find((h: any) => h.id === allocation.hostelId);
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
      }
    } catch (error) {
      console.error("Error checking existing allocation:", error);
    }
  }, [hostels, session]);

  useEffect(() => {
    if (hostels.length > 0 && !allocationChecked) {
      setAllocationChecked(true);
      checkExistingAllocation();
    }
  }, [hostels, allocationChecked, checkExistingAllocation]);

  return {
    existingAllocation,
    allocationRoomDetails,
    checkExistingAllocation
  };
};

export default useStudentAllocation;
