import express from "express";
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

// ------------------ Tution data collection
app.post("/add-tution", async (req, res) => {
  try {
    const { tuitions } = await connectToMongoDB();
    const tutionData = req.body;

    const existingTutionPost = await tuitions.findOne({
      title: tutionData.title,
      subject: tutionData.subject,
      bannerImage: tutionData.bannerImage,
    });

    if (existingTutionPost) {
      return res.status(409).send({
        success: false,
        message: "This tution post is already exists!",
      });
    }

    const insertTutionData = {
      ...tutionData,
      createdAt: new Date(),
    };

    const result = await tuitions.insertOne(insertTutionData);
    return res.status(201).json({
      success: true,
      message: "Tuition posted successfully!",
      insertedId: result.insertedId,
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Failed to add tution",
      error: err?.message,
    });
  }
});

app.listen(port, () =>
  console.log(`MentorLagbe server running on port ${port}`),
);
