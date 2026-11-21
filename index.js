import express, { json } from "express";
import cors from "cors";
import { connectToMongoDB } from "./db.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  await connectToMongoDB();

  res.send("MentorLagbe Server is Running");
});

//            Tuition data collection
// ------------------ Post tution
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

// ------------------ Get tuition
app.get("/tuition", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const result = await tuitions.find().toArray();

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tuition!",
      error: err?.message,
    });
  }
});

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

app.listen(port, () =>
  console.log(`MentorLagbe server running on port ${port}`),
);
