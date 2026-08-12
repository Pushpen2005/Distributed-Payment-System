import 'dotenv/config'; 
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

await connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Wallet service is running on port ${PORT}`);
});