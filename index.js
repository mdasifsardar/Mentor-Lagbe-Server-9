import express from "express";
import cors from "cors";
import { connectToMongoDB } from "./db.js";
import { ObjectId } from "mongodb";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ------------------ Server health check
app.get("/", async (req, res) => {
  await connectToMongoDB();

  res.send("MentorLagbe Server is Running");
});

// ------------------ Tuition data collection

// ------------------ Add tuition
app.post("/add-tuition", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const tutionData = req.body;

    const existingTutionPost = await tuitions.findOne({
      title: tutionData.title,
      subject: tutionData.subject,
      bannerImage: tutionData.bannerImage,
    });

    if (existingTutionPost) {
      return res.status(409).json({
        success: false,
        message: "This tuition post is already exists!",
      });
    }

    const insertTutionData = {
      ...tutionData,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
    };

    const result = await tuitions.insertOne(insertTutionData);
    return res.status(201).json({
      success: true,
      message: "Tuition posted successfully!",
      insertedId: result.insertedId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to add tution",
      error: err?.message,
    });
  }
});

// ------------------ Get all tuition with filters
app.get("/tuitions", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();

    const query = {
      approvalStatus: "approved",
      isActive: true,
    };

    if (req.query.subject) {
      query.subject = {
        $regex: req.query.subject,
        $options: "i",
      };
    }

    if (req.query.classLevel) {
      query.classLevel = {
        $regex: req.query.classLevel,
        $options: "i",
      };
    }

    if (req.query.mode) {
      query.mode = {
        $regex: req.query.mode,
        $options: "i",
      };
    }

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { subject: { $regex: req.query.search, $options: "i" } },
        { tutorName: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const result = await tuitions.find(query).sort({ createdAt: -1 }).toArray();

    res.status(200).json({
      success: true,
      tuitions: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuitions",
    });
  }
});

// ------------------ Get tuition by ID
app.get("/tuition/:id", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      const tutorTuitions = await tuitions.find({ tutorEmail: id }).toArray();
      return res.status(200).json(tutorTuitions);
    }

    const tuition = await tuitions.findOne({
      _id: new ObjectId(id),
      approvalStatus: "approved",
      isActive: true,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found",
      });
    }

    return res.status(200).json({
      success: true,
      tuition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tuition",
      error: error.message,
    });
  }
});

// ------------------ Get tuition by tutor email
app.get("/tuition/:tutorEmail", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const { tutorEmail } = req.params;

    const result = await tuitions
      .find({
        tutorEmail,
      })
      .toArray();

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tuition!",
      error: err?.message,
    });
  }
});

// ------------------ Update tuition active status by ID
app.patch("/tuition/:id", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await tuitions.updateOne(
      {
        _id: new ObjectId(id),
      },
      { $set: { isActive } },
    );

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update tuition!",
      error: err?.message,
    });
  }
});

// ------------------ Update tuition data by ID
app.patch("/update-tuition/:id", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const { id } = req.params;

    const { isActive, ...query } = req.body;
    const result = await tuitions.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: query,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Tuition updated successfully",
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update tuition!",
      error: err?.message,
    });
  }
});

// ------------------ Delete tuition by ID
app.delete("/delete-tuition/:id", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const { id } = req.params;

    const result = await tuitions.deleteOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: "Tuition deleted successfully!",
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete tuition!",
      error: err?.message,
    });
  }
});

// ------------------ Get student dashboard data by email
app.get("/student-dashboard/:email", async (req, res) => {
  try {
    const { user, applications } = await connectToMongoDB();

    const email = decodeURIComponent(req.params.email);

    // Get student information
    const student = await user.findOne({ email });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check student role
    if (!student || student.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Students only.",
      });
    }

    // Get student's applications
    const studentApplications = await applications
      .find({ studentEmail: email })
      .sort({ appliedAt: -1 })
      .toArray();

    // Calculate application statistics
    const totalApplied = studentApplications.length;

    const acceptedApplications = studentApplications.filter(
      (item) => item.status === "accepted",
    ).length;

    const pendingApplications = studentApplications.filter(
      (item) => item.status === "pending",
    ).length;

    // Get latest 5 applications
    const recentApplications = studentApplications.slice(0, 5);

    return res.status(200).json({
      success: true,
      stats: {
        totalApplied,
        acceptedApplications,
        pendingApplications,
        currentPlan: student.plan || "free",
      },
      recentApplications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student dashboard",
      error: error.message,
    });
  }
});

// ------------------ Get student applications by email
app.get("/applications/student/:email", async (req, res) => {
  try {
    const { applications } = await connectToMongoDB();

    const email = decodeURIComponent(req.params.email);

    const studentApplications = await applications
      .find({ studentEmail: email })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      applications: studentApplications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student applications",
      error: error.message,
    });
  }
});

// ------------------ Get tutor applicants (public)
app.get("/applications/tutor/:email", async (req, res) => {
  try {
    const { applications } = await connectToMongoDB();

    const email = decodeURIComponent(req.params.email);

    const tutorApplications = await applications
      .find({ tutorEmail: email })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      applications: tutorApplications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tutor applications",
      error: error.message,
    });
  }
});

// ------------------ Apply for tuition
app.post("/applications", async (req, res) => {
  try {
    const { applications, tuitions } = await connectToMongoDB();

    const {
      tuitionId,
      studentEmail,
      studentName,
      studentPhone,
      preferredSchedule,
      studentNote,
    } = req.body;

    // Validate tuition ID
    if (!ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID",
      });
    }

    // Check tuition availability
    const tuition = await tuitions.findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: "approved",
      isActive: true,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not available",
      });
    }

    // Check for existing application
    const existingApplication = await applications.findOne({
      tuitionId,
      studentEmail,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this tuition.",
      });
    }

    // Create new application
    const result = await applications.insertOne({
      tuitionId,
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName,
      studentEmail,
      studentPhone,
      preferredSchedule,
      studentNote,
      status: "pending",
      appliedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error.message,
    });
  }
});

// ------------------ Cancel pending application
app.delete("/applications/:id", async (req, res) => {
  try {
    const { applications } = await connectToMongoDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id",
      });
    }

    const application = await applications.findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be cancelled",
      });
    }

    await applications.deleteOne({ _id: application._id });

    return res.status(200).json({
      success: true,
      message: "Application cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel application",
      error: error.message,
    });
  }
});

// ------------------ Admin
// ------------------ Get overview statistics
app.get("/admin/stats", async (req, res) => {
  try {
    const { user, tuitions, applications } = await connectToMongoDB();

    const [
      totalUsers,
      totalTutors,
      totalStudents,
      pendingTuitions,
      approvedTuitions,
      totalTuitions,
      totalApplications,
    ] = await Promise.all([
      user.countDocuments(),
      user.countDocuments({ role: "tutor" }),
      user.countDocuments({ role: "student" }),
      tuitions.countDocuments({ approvalStatus: "pending" }),
      tuitions.countDocuments({ approvalStatus: "approved" }),
      tuitions.countDocuments(),
      applications.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTutors,
        totalStudents,
        pendingTuitions,
        approvedTuitions,
        totalTuitions,
        totalApplications,
        totalRevenue: 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin statistics",
      error: error.message,
    });
  }
});

// ------------------ Admin users
app.get("/admin/users", async (req, res) => {
  try {
    const { user } = await connectToMongoDB();
    const users = await user
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            plan: 1,
            image: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load users",
      error: error.message,
    });
  }
});

// ------------------ Update user role
app.patch("/admin/users/:id/role", async (req, res) => {
  try {
    // Validate user ID
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    // Validate user role
    if (!["student", "tutor", "admin"].includes(req.body.role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const { user } = await connectToMongoDB();
    const target = await user.findOne({ _id: new ObjectId(req.params.id) });

    // Check if user exists
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update user role
    await user.updateOne(
      { _id: target._id },
      { $set: { role: req.body.role } },
    );

    return res.status(200).json({
      success: true,
      message: `Role updated to ${req.body.role}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
});

// ------------------ Get all tuitions for admin
app.get("/admin/tuitions", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const tuitionsList = await tuitions
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, tuitions: tuitionsList });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load tuitions",
      error: error.message,
    });
  }
});

// ------------------ Update tuition approval status
app.patch("/admin/tuitions/:id/approval", async (req, res) => {
  try {
    // Validate tuition ID
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition id",
      });
    }

    // Validate approval status
    if (
      !["approved", "rejected", "pending"].includes(req.body.approvalStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status",
      });
    }

    const { tuitions } = await connectToMongoDB();
    const tuition = await tuitions.findOne({
      _id: new ObjectId(req.params.id),
    });

    // Check if tuition exists
    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found",
      });
    }

    // Update tuition approval status
    await tuitions.updateOne(
      { _id: tuition._id },
      {
        $set: {
          approvalStatus: req.body.approvalStatus,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: `Tuition ${req.body.approvalStatus} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update tuition approval",
      error: error.message,
    });
  }
});

// ------------------ Get admin transactions
app.get("/admin/transactions", async (req, res) => {
  try {
    const { payments } = await connectToMongoDB();

    const transactions = payments
      ? await payments.find({}).sort({ paidAt: -1 }).toArray()
      : [];

    const totalRevenue = transactions.reduce(
      (total, t) => total + Number(t.amount || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      transactions,
      totalRevenue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load transactions",
      error: error.message,
    });
  }
});

// ------------------ Start server
app.listen(port, () =>
  console.log(`MentorLagbe server running on port ${port}`),
);
