import { OperationLoader } from "./OperationLoader";

export class OperationTester {
  private operationLoader: OperationLoader;

  constructor() {
    this.operationLoader = new OperationLoader();
  }

  async testOperations(): Promise<void> {
    console.log("🧪 Testing Operation Generation and Caching...\n");

    const testCases = [
      // Invalid operations
      { name: "invalidOperation", expectedType: null },
      { name: "nonExistentSchema", expectedType: null },
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      try {
        console.log(`Testing: ${testCase.name}`);

        // Test operation loading
        const operation = await this.operationLoader.loadOperation(
          testCase.name
        );

        if (testCase.expectedType === null) {
          if (operation === null) {
            console.log(`✅ Correctly returned null for invalid operation`);
            passed++;
          } else {
            console.log(`❌ Expected null but got operation`);
            failed++;
          }
        } else {
          if (operation) {
            if (operation.type === testCase.expectedType) {
              console.log(`✅ Correct operation type: ${operation.type}`);
              console.log(`   Variables: ${operation.variables.join(", ")}`);
              console.log(`   Query length: ${operation.query.length} chars`);
              passed++;
            } else {
              console.log(
                `❌ Expected ${testCase.expectedType} but got ${operation.type}`
              );
              failed++;
            }
          } else {
            console.log(`❌ Expected operation but got null`);
            failed++;
          }
        }

        // Test caching (second load should be faster)
        const startTime = Date.now();
        await this.operationLoader.loadOperation(testCase.name);
        const loadTime = Date.now() - startTime;

        if (loadTime < 50) {
          // Should be very fast from cache
          console.log(`✅ Cache working - load time: ${loadTime}ms`);
        } else {
          console.log(`⚠️  Possible cache miss - load time: ${loadTime}ms`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${testCase.name}:`, error);
        failed++;
      }

      console.log("");
    }

    // Test cache invalidation
    console.log("Testing cache invalidation...");
    try {
      await this.operationLoader.invalidateOperation("getVariants");
      await this.operationLoader.invalidateSchemaOperations(
        "health_product_variants"
      );
      console.log("✅ Cache invalidation completed");
      passed++;
    } catch (error) {
      console.log("❌ Cache invalidation failed:", error);
      failed++;
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log("🎉 All tests passed!");
    } else {
      console.log("⚠️  Some tests failed. Check implementation.");
    }
  }

  async testSpecificOperation(operationName: string): Promise<void> {
    console.log(`🔍 Testing specific operation: ${operationName}\n`);

    try {
      const operation = await this.operationLoader.loadOperation(operationName);

      if (operation) {
        console.log("✅ Operation found:");
        console.log(`   Type: ${operation.type}`);
        console.log(`   Variables: ${operation.variables.join(", ")}`);
        console.log(`   Schema: ${operation.schema || "Not specified"}`);
        console.log(`   Description: ${operation.description || "None"}`);
        console.log("\n📝 Generated Query:");
        console.log(operation.query);
      } else {
        console.log("❌ Operation not found");
      }
    } catch (error) {
      console.log("❌ Error loading operation:", error);
    }
  }

  async benchmarkOperationLoading(): Promise<void> {
    console.log("📈 Benchmarking operation loading performance...\n");

    const operations = [""];

    for (const operationName of operations) {
      // Warm up
      await this.operationLoader.loadOperation(operationName);

      // Benchmark
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await this.operationLoader.loadOperation(operationName);
      }

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / iterations;

      console.log(
        `${operationName}: ${avgTime.toFixed(
          2
        )}ms average (${iterations} iterations)`
      );
    }
  }
}

// Usage example function
export async function runOperationTests(): Promise<void> {
  const tester = new OperationTester();

  await tester.testOperations();

  console.log("\n" + "=".repeat(50));
  await tester.testSpecificOperation("getVariants");

  console.log("\n" + "=".repeat(50));
  await tester.benchmarkOperationLoading();
}
