// AA-K1/AA-K2: structural defects that `kubectl apply` (strict validation) rejects.
// Verified independently with kubeconform v0.6.7 against Kubernetes 1.29 schemas.
import { describe, test, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

const root = path.resolve("..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").split("\n");
const indent = (l) => l.match(/^ */)[0].length;

describe("k8s manifests — schema-level defects", () => {
  test("backend Deployment: `optional` only appears inside a secretKeyRef/configMapKeyRef", () => {
    const lines = read("k8s/backend/deployment.yaml");
    let refIndent = null;
    lines.forEach((l, i) => {
      if (/^\s*(secretKeyRef|configMapKeyRef):\s*$/.test(l)) refIndent = indent(l);
      else if (/^\s*valueFrom:\s*$/.test(l) || /^\s*-\s+name:/.test(l)) refIndent = null;
      if (/^\s*optional:\s*(true|false)\s*$/.test(l)) {
        expect({ line: i + 1, insideRef: refIndent !== null && indent(l) > refIndent }).toEqual({ line: i + 1, insideRef: true });
      }
    });
  });
  test("canary strategy: no stray YAML sequence marker among comments", () => {
    for (const l of read("k8s/strategies/canary-deployment.yaml")) {
      expect(l).not.toMatch(/^-\s+#/);
    }
  });
});
