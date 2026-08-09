import 'dotenv/config'; 
import app from "./src/app.js";
import {connectDB} from "./src/config/db.js";
await connectDB();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Auth service is working on port ${PORT}`);
});


