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

app.listen(port, () =>
  console.log(`MentorLagbe server running on port ${port}`),
);
