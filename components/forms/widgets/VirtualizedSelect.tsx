"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// Removed unused Command imports since we're using custom implementation
import { FixedSizeList as List } from "react-window";
import { requestCache } from "@/lib/cache/RequestCache";
import { ForeignKey, Option } from "@/lib/schema/types";

interface VirtualizedSelectProps {
  name: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  targetComponent: string;
  displayField?: string;
  label?: string;
  helpText?: string;
  foreignKey?: ForeignKey;
}

const ITEM_HEIGHT = 40;
const MAX_VISIBLE_ITEMS = 10;

export const VirtualizedSelect: React.FC<VirtualizedSelectProps> = ({
  name,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  required = false,
  error,
  targetComponent,
  displayField = "name",
  label,
  helpText,
  foreignKey,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected option details when value is provided
  useEffect(() => {
    if (value && !selectedOption) {
      loadSelectedOption(value);
    } else if (!value) {
      setSelectedOption(null);
    }
  }, [value]);

  // Search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Always search when dropdown is open, regardless of hasSearched state
    if (open) {
      searchTimeoutRef.current = setTimeout(() => {
        searchOptions(searchTerm);
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, open]);

  // Load individual option by ID (for selected values)
  const loadSelectedOption = async (optionId: string) => {
    try {
      const cacheKey = `single_option:${targetComponent}:${optionId}`;

      const result = await requestCache.get(cacheKey, async () => {
        const url = `/api/graphql/options/${targetComponent}/${optionId}?labelField=${displayField}&valueField=${foreignKey?.column}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch option: ${response.statusText}`);
        }

        return await response.json();
      });

      if (result.data) {
        setSelectedOption(result.data);
      }
    } catch (err) {
      console.error("Failed to load selected option:", err);
    }
  };

  // Search options with backend filtering
  const searchOptions = async (search: string) => {
    try {
      setLoading(true);
      setHasSearched(true);

      const cacheKey =
        requestCache.getOptionsKey(
          targetComponent,
          50, // Load fewer items for better performance
          displayField,
          "asc"
        ) + `:search:${search}`;

      const result = await requestCache.get(cacheKey, async () => {
        const params = new URLSearchParams({
          limit: "50",
          orderBy: displayField,
          direction: "asc",
          ...(search && { search }),
        });

        // Only add search param if there's actually a search term
        if (search.trim()) {
          params.append("search", search.trim());
        }

        const url = `/api/graphql/options/${targetComponent}?${params}&labelField=${displayField}&valueField=${foreignKey?.column}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch options: ${response.statusText}`);
        }

        return await response.json();
      });

      const data = result.data || [];
      setOptions(data);
    } catch (err) {
      console.error("Failed to search options:", err);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle option selection
  const handleSelect = (option: Option | null) => {
    setSelectedOption(option);
    onChange(option?.value || null);
    setOpen(false);
    setSearchTerm("");
  };

  // Virtualized list item renderer
  const ListItem = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const option = options[index];
    const isSelected = value === option.value;

    return (
      <div
        style={style}
        className={`flex items-center px-3 py-2 cursor-pointer hover:bg-muted ${
          isSelected ? "bg-accent text-accent-foreground" : ""
        }`}
        onClick={() => handleSelect(option)}
      >
        <div className="flex-1 truncate">{option.label}</div>
        {isSelected && <Check className="h-4 w-4 ml-2" />}
      </div>
    );
  };

  // Memoized list height calculation
  const listHeight = useMemo(() => {
    const itemCount = Math.min(options.length, MAX_VISIBLE_ITEMS);
    return itemCount * ITEM_HEIGHT;
  }, [options.length]);

  return (
    <div className="space-y-2">
      {label && (
        <Label
          htmlFor={name}
          className={
            required
              ? "after:content-['*'] after:ml-0.5 after:text-destructive"
              : ""
          }
        >
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={`w-full justify-between ${
              error ? "border-destructive" : ""
            }`}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder={`Search ${targetComponent}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-auto p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Clear Selection */}
            {value && (
              <div className="border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelect(null)}
                  className="w-full justify-start text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </Button>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-80 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">Loading...</span>
                </div>
              ) : options.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {hasSearched ? "No options found" : "Type to search..."}
                </div>
              ) : (
                <List
                  width={300}
                  height={listHeight}
                  itemCount={options.length}
                  itemSize={ITEM_HEIGHT}
                  overscanCount={5}
                >
                  {ListItem}
                </List>
              )}
            </div>

            {/* Show more indicator */}
            {options.length >= 50 && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground text-center">
                Showing first 50 results. Use search to find more specific
                options.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
    </div>
  );
};
