import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockUpload = jest.fn();
const mockUnlinkSync = jest.fn();

jest.unstable_mockModule("../config/cloudinary.js", () => ({
  __esModule: true,
  default: { uploader: { upload: mockUpload } },
}));

jest.unstable_mockModule("fs", () => ({
  __esModule: true,
  default: { unlinkSync: mockUnlinkSync },
}));

const { uploadToCloudinary } = await import("../services/media.service.js");

describe("media.service", () => {
  beforeEach(() => {
    mockUpload.mockClear();
    mockUnlinkSync.mockClear();
  });

  it("uploads successfully and returns formatted result", async () => {
    mockUpload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/...",
      public_id: "kayad/cars/abc123",
      width: 1200,
      height: 800,
    });

    const result = await uploadToCloudinary("/tmp/car.jpg");

    expect(result).toEqual({
      url: "https://res.cloudinary.com/...",
      public_id: "kayad/cars/abc123",
      width: 1200,
      height: 800,
    });
    expect(mockUnlinkSync).toHaveBeenCalledWith("/tmp/car.jpg");
  });

  it("passes correct upload options", async () => {
    mockUpload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/...",
      public_id: "kayad/cars/abc123",
      width: 800,
      height: 600,
    });

    await uploadToCloudinary("/tmp/car.jpg");

    expect(mockUpload).toHaveBeenCalledWith("/tmp/car.jpg", {
      folder: "kayad/cars",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 800, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });
  });

  it("throws and does not unlink on upload failure", async () => {
    const uploadErr = new Error("Network error");
    mockUpload.mockRejectedValue(uploadErr);

    await expect(uploadToCloudinary("/tmp/car.jpg")).rejects.toThrow("Network error");
    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });
});
