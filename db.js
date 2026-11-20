import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    const database = client.db("mentor-lagbe");
    const user = database.collection("user");
    const tuitions = database.collection("tuitions");

    return {
      user,
      tuitions,
    };
  } catch (err) {
    console.dir(err);
  }
}

connectToMongoDB();
