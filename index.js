import express, { json } from "express";
import cors from "cors";
import { connectToMongoDB } from "./db.js";
import { ObjectId } from "mongodb";

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

// ------------------ Get tuition by tutorEmail
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

// ------------------ Update isActive only by :_id
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

// ------------------ Update tuition data by :_id
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

// ------------------ Delete tuition data by :_id
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

app.listen(port, () =>
  console.log(`MentorLagbe server running on port ${port}`),
);
