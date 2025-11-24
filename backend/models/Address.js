import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  // Province level
  province: { type: String, required: true, unique: true },

  // Districts with their wards
  districts: [
    {
      name: { type: String, required: true },
      wards: [
        {
          name: { type: String, required: true },
        },
      ],
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

// Create index for faster searches on nested districts
// Note: province index is automatically created by unique: true
addressSchema.index({ "districts.name": 1 });

export default mongoose.model("Address", addressSchema);
