import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KAYAD API",
      version: "2.0.0",
      description: "KAYAD Car Marketplace — Live Auctions, M-Pesa Payments, Escrow, Dealer Management",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            details: { type: "object" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["user", "dealer", "admin"] },
            phone: { type: "string" },
          },
        },
        Car: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            brand: { type: "string" },
            model: { type: "string" },
            year: { type: "integer" },
            price: { type: "number" },
            status: { type: "string", enum: ["active", "sold", "pending"] },
            auctionStatus: { type: "string", enum: ["draft", "live", "ended"] },
          },
        },
        Bid: {
          type: "object",
          properties: {
            _id: { type: "string" },
            carId: { type: "string" },
            amount: { type: "number" },
            status: { type: "string", enum: ["pending", "paid", "failed"] },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
