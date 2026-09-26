import 'dotenv/config'; 
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import  redisClient  from "./src/config/redis.js";
await connectDB();

const PORT = process.env.PORT || 5000;
const response = await redisClient.ping();

console.log("Redis PING:", response);
app.listen(PORT, () => {
  console.log(`Wallet service is running on port ${PORT}`);
});