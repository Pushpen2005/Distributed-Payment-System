import app from "./src/app.js";



const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Payment service is running on port ${PORT}`);
});
