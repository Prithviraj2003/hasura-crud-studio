"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isSubmitting: boolean;
  isDirty: boolean;
  mode: "create" | "edit";
  onCancel?: () => void;
  hasChanges?: boolean; // Additional prop to track changes
  isProcessing?: boolean; // Custom processing state
}

export const FormActions: React.FC<FormActionsProps> = ({
  isSubmitting,
  isDirty,
  mode,
  onCancel,
  hasChanges,
  isProcessing,
}) => {
  return (
    <div className="flex justify-between items-center p-4 bg-muted border-t">
      <div>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </Button>
        )}
      </div>
      <div>
        <Button
          type="submit"
          variant="strapiPrimary"
          disabled={
            isSubmitting ||
            isProcessing ||
            (mode === "edit" && !isDirty && !hasChanges) ||
            (mode === "create" && !isDirty)
          }
          className="flex items-center space-x-2"
        >
          {isSubmitting || isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{mode === "create" ? "Create" : "Save changes"}</span>
        </Button>
      </div>
    </div>
  );
};
