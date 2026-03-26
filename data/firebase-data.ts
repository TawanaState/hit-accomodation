// Define the type for the application
export type Applications = {
  name: string;
  regNumber: string;
  gender: "Male" | "Female";
  programme: string;
  part: number;
  email: string;
  phone: string;
  status: "Pending" | "Accepted" | "Archived" | "Rejected";
  submittedAt: string;
  date: string; // New field for date
  time: string; // New field for time
  paymentStatus: string;
  reference: string;
  session?: any;
};

/**
 * Fetches all student profiles and their application data
 * Refactored to use the new MongoDB-backed API route.
 */
export const fetchAllApplications = async (sessionId?: string): Promise<Applications[]> => {
  try {
    const url = sessionId ? `/api/applications?sessionId=${sessionId}` : "/api/applications";
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch applications: ${res.statusText}`);
    }

    const applicationsList: Applications[] = await res.json();
    return applicationsList;
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

/**
 * Updates the status of a specific application
 * Refactored to use the new MongoDB-backed API route.
 * @param regNumber - The registration number of the application
 * @param status - The new status ("Pending", "Accepted", or "Archived", "Rejected")
 */
export const updateApplicationStatus = async (
  regNumber: string,
  status: "Pending" | "Accepted" | "Archived" | "Rejected"
) => {
  try {
    const res = await fetch(`/api/applications/${regNumber}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update application status: ${res.statusText}`);
    }

    console.log(`Application ${regNumber} status updated to ${status}`);
  } catch (error) {
    console.error("Error updating application status:", error);
  }
};

/**
 * Fetch all students from MongoDB students collection
 */
export const fetchAllStudentsFromStudentsCollection = async (): Promise<any[]> => {
  try {
    const res = await fetch("/api/students", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch students: ${res.statusText}`);
    }

    const studentsList = await res.json();
    return studentsList;
  } catch (error) {
    console.error("Error fetching students from students collection:", error);
    throw new Error("Failed to fetch students from students collection. Please ensure the students collection is populated.");
  }
};
