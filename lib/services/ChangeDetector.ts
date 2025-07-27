export interface ChangeDetection {
  hasMainEntityChanges: boolean;
  hasRelationshipChanges: boolean;
  changedRelationships: {
    [relationshipName: string]: {
      added: any[];
      updated: any[];
      deleted: any[];
    };
  };
  mainEntityData: any;
}

export class ChangeDetector {
  static detectChanges(
    originalData: any,
    currentData: any,
    relationships: any[]
  ): ChangeDetection {
    const result: ChangeDetection = {
      hasMainEntityChanges: false,
      hasRelationshipChanges: false,
      changedRelationships: {},
      mainEntityData: {},
    };

    // Extract main entity fields (non-relationship fields)
    const mainEntityFields = { ...currentData };
    const originalMainFields = { ...originalData };

    // Remove relationship fields from main entity comparison
    relationships.forEach((rel) => {
      delete mainEntityFields[rel.name];
      delete originalMainFields[rel.name];
    });

    // Check for main entity changes
    result.hasMainEntityChanges = this.hasObjectChanged(
      originalMainFields,
      mainEntityFields
    );
    result.mainEntityData = mainEntityFields;

    console.log("Main entity change detection:", {
      hasChanges: result.hasMainEntityChanges,
      originalKeys: Object.keys(originalMainFields),
      currentKeys: Object.keys(mainEntityFields),
      originalData: originalMainFields,
      currentData: mainEntityFields,
    });

    // Check for relationship changes
    relationships.forEach((relationship) => {
      const originalRelData = originalData[relationship.name] || [];
      const currentRelData = currentData[relationship.name] || [];

      console.log(`Checking relationship ${relationship.name}:`, {
        originalCount: originalRelData.length,
        currentCount: currentRelData.length,
      });

      const relationshipChanges = this.detectRelationshipChanges(
        originalRelData,
        currentRelData
      );

      if (
        relationshipChanges.added.length > 0 ||
        relationshipChanges.updated.length > 0 ||
        relationshipChanges.deleted.length > 0
      ) {
        result.hasRelationshipChanges = true;
        result.changedRelationships[relationship.name] = relationshipChanges;
        console.log(
          `Relationship ${relationship.name} has changes:`,
          relationshipChanges
        );
      } else {
        console.log(`Relationship ${relationship.name} has no changes`);
      }
    });

    return result;
  }

  private static hasObjectChanged(original: any, current: any): boolean {
    // Handle null/undefined cases
    if (original === null && current === null) return false;
    if (original === undefined && current === undefined) return false;
    if (original === null || current === null) return true;
    if (original === undefined || current === undefined) return true;

    const originalKeys = Object.keys(original).filter(
      (key) => !key.startsWith("_")
    );
    const currentKeys = Object.keys(current).filter(
      (key) => !key.startsWith("_")
    );

    // Get all unique keys from both objects
    const allKeys = [...new Set([...originalKeys, ...currentKeys])];

    for (const key of allKeys) {
      const originalValue = original[key];
      const currentValue = current[key];

      // Check if key exists in both objects
      const originalHasKey = originalKeys.includes(key);
      const currentHasKey = currentKeys.includes(key);

      if (originalHasKey !== currentHasKey) {
        console.log("Object changed: key existence differs", {
          key,
          originalHasKey,
          currentHasKey,
        });
        return true;
      }

      // Use deep comparison for values
      if (!this.isEqual(originalValue, currentValue)) {
        console.log("Object changed: different value for key", {
          key,
          originalValue,
          currentValue,
          originalType: typeof originalValue,
          currentType: typeof currentValue,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Deep equality comparison that handles common data types
   */
  private static isEqual(a: any, b: any): boolean {
    // Strict equality check
    if (a === b) return true;

    // Handle null/undefined
    if (a == null || b == null) return a === b;

    // Handle different types
    if (typeof a !== typeof b) {
      // Special case: string/number comparison (form inputs often convert)
      if ((typeof a === 'string' && typeof b === 'number') || 
          (typeof a === 'number' && typeof b === 'string')) {
        return String(a) === String(b);
      }
      return false;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.isEqual(a[key], b[key])) return false;
      }
      return true;
    }

    // For primitive types that passed strict equality, they're different
    return false;
  }

  private static detectRelationshipChanges(original: any[], current: any[]) {
    const added: any[] = [];
    const updated: any[] = [];
    const deleted: any[] = [];

    // Create maps for easier lookup
    const originalMap = new Map();
    const currentMap = new Map();

    original.forEach((item) => {
      if (item.id) {
        originalMap.set(item.id, item);
      }
    });

    current.forEach((item) => {
      if (item.id) {
        currentMap.set(item.id, item);
      }
    });

    // Find added items (exist in current but not in original)
    current.forEach((item) => {
      if (!item.id || !originalMap.has(item.id)) {
        // New item (no ID or ID not in original)
        added.push(item);
      } else {
        // Existing item - check if updated
        const originalItem = originalMap.get(item.id);
        if (this.hasObjectChanged(originalItem, item)) {
          console.log(`Item ${item.id} has changes:`, {
            original: originalItem,
            current: item,
          });
          updated.push(item);
        }
      }
    });

    // Find deleted items (exist in original but not in current)
    original.forEach((item) => {
      if (item.id && !currentMap.has(item.id)) {
        deleted.push(item);
      }
    });

    // Only return changes if there are actual changes
    if (added.length === 0 && updated.length === 0 && deleted.length === 0) {
      return { added: [], updated: [], deleted: [] };
    }

    console.log(`Relationship changes detected:`, {
      added: added.length,
      updated: updated.length,
      deleted: deleted.length,
    });

    return { added, updated, deleted };
  }
}
