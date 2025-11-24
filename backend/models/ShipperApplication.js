import mongoose from "mongoose";

const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    province: String,
    district: String,
    ward: String,
    description: String,
  },
  { _id: false }
);

const documentsSchema = new Schema(
  {
    portraitUrl: String,
    nationalIdFrontUrl: String,
    nationalIdBackUrl: String,
    driverLicenseUrl: String,
    vehicleRegistrationUrl: String,
  },
  { _id: false }
);

const reviewSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,
    decidedAt: Date,
  },
  { _id: false }
);

const shipperApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    personalInfo: {
      fullName: String,
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      gender: String,
      nationalId: String,
    },
    contactInfo: {
      email: String,
      phone: String,
      address: String,
      emailVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },
    },
    vehicleInfo: {
      vehicleType: String,
      brand: String,
      model: String,
      licensePlate: String,
      licenseNumber: String,
      color: String,
    },
    operationAreas: [locationSchema],
    documents: documentsSchema,
    training: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      courseId: String,
    },
    submittedAt: Date,
    review: reviewSchema,
    history: [
      {
        action: String,
        note: String,
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("ShipperApplication", shipperApplicationSchema);
