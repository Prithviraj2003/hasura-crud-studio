export class IdGeneratorService {
  private static readonly ID_GENERATION_URL = "EXTERNAL_ID_GENERATION_URL";

  static async generateId(): Promise<string> {
    try {
      const response = await fetch(this.ID_GENERATION_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Generate a 16 character random ID as fallback
        const fallbackId =
          Math.random().toString(36).substring(2, 10) +
          Math.random().toString(36).substring(2, 10);
        console.log("fallbackId", fallbackId);
        return fallbackId;
        // throw new Error(`Failed to generate ID: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.id || typeof data.id !== "string") {
        throw new Error("Invalid response format from ID generation service");
      }

      return data.id;
    } catch (error) {
      console.error("Error generating ID:", error);

      // Fallback to UUID if the service is unavailable
      return this.generateFallbackId();
    }
  }

  private static generateFallbackId(): string {
    // Generate a 16 character random ID
    return (
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10)
    );
  }

  static async generateMultipleIds(count: number): Promise<string[]> {
    const promises = Array(count)
      .fill(null)
      .map(() => this.generateId());
    return Promise.all(promises);
  }
}
