// backend/config/opentelemetry.js
// ─────────────────────────────────────────────────────────────
// OpenTelemetry Configuration
// Provides distributed tracing for the application
// ─────────────────────────────────────────────────────────────

import pkg from "@opentelemetry/sdk-node";
const { NodeSDK } = pkg;
import pkg2 from "@opentelemetry/resources";
const { Resource } = pkg2;
import pkg3 from "@opentelemetry/semantic-conventions";
const { SemanticResourceAttributes } = pkg3;
import pkg4 from "@opentelemetry/auto-instrumentations-node";
const { getNodeAutoInstrumentations } = pkg4;
import pkg5 from "@opentelemetry/sdk-trace-node";
const { ConsoleSpanExporter } = pkg5;
import pkg6 from "@opentelemetry/sdk-trace-base";
const { BatchSpanProcessor } = pkg6;
import { logInfo, logError } from "../utils/logger.js";

// Check if OpenTelemetry is enabled
const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";
const OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

/**
 * Initialize OpenTelemetry SDK
 */
export const initOpenTelemetry = () => {
  if (!OTEL_ENABLED) {
    logInfo("OpenTelemetry: Disabled (set OTEL_ENABLED=true to enable)");
    return;
  }

  try {
    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "kayad-backend",
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || "2.0.0",
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
        [SemanticResourceAttributes.HOSTNAME]: process.env.HOSTNAME || "localhost",
      }),
      // Auto-instrumentations for Node.js
      instrumentations: [getNodeAutoInstrumentations({
        // Disable specific instrumentations if needed
        "@opentelemetry/instrumentation-http": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-mongodb": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-redis": {
          enabled: true,
        },
      })],
      // Span processors
      spanProcessor: new BatchSpanProcessor(
        new ConsoleSpanExporter()
      ),
      // Add OTLP exporter if endpoint is provided
      // Note: You would need to install @opentelemetry/exporter-trace-otlp-grpc
      // and uncomment the following for production use
      /*
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: OTEL_EXPORTER_OTLP_ENDPOINT,
        })
      ),
      */
    });

    sdk.start();
    logInfo("OpenTelemetry: Initialized successfully", {
      serviceName: process.env.OTEL_SERVICE_NAME || "kayad-backend",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    logError("OpenTelemetry: Failed to initialize", error);
  }
};

export default { initOpenTelemetry };
