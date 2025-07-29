"use client";

import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  Box,
  Button,
  Typography,
  Checkbox,
  Searchbar,
  Badge,
  Grid,
  GridItem,
  Card,
  CardBody,
  Loader,
} from "@strapi/design-system";
import { Cross } from "@strapi/icons";
import { RelationshipConfig } from "@/lib/schema/FormGenerator";
import { requestCache } from "@/lib/cache/RequestCache";

interface ManyToManyManagerProps {
  relationship: RelationshipConfig;
  fieldName: string;
}

interface Item {
  id: string;
  [key: string]: any;
}

export const ManyToManyManager: React.FC<ManyToManyManagerProps> = ({
  relationship,
  fieldName,
}) => {
  const { control, watch } = useFormContext();
  const selectedItems = watch(fieldName) || [];
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    loadAvailableItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchValue, availableItems]);

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      const displayField = relationship.displayField || "name";

      // Generate cache key
      const cacheKey = requestCache.getOptionsKey(relationship.targetComponent, 100, displayField, 'asc');

      // Use cache to prevent duplicate requests and consistent GET method
      const result = await requestCache.get(cacheKey, async () => {
        const url = `/api/graphql/options/${relationship.targetComponent}?limit=100&orderBy=${displayField}&direction=asc`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch options: ${response.statusText}`);
        }

        return await response.json();
      });

      const items = result.data || [];
      setAvailableItems(items);
      setFilteredItems(items);
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchValue.trim()) {
      setFilteredItems(availableItems);
      return;
    }

    const displayField = relationship.displayField || "name";
    const filtered = availableItems.filter((item) =>
      item[displayField]?.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const isSelected = (item: Item) => {
    return selectedItems.some(
      (selected: any) => (selected.id || selected) === item.id
    );
  };

  const toggleItem = (item: Item, onChange: (value: any) => void) => {
    const currentSelected = selectedItems || [];

    if (isSelected(item)) {
      // Remove item
      const newSelected = currentSelected.filter(
        (selected: any) => (selected.id || selected) !== item.id
      );
      onChange(newSelected);
    } else {
      // Add item
      const newSelected = [...currentSelected, { id: item.id }];
      onChange(newSelected);
    }
  };

  const displayField = relationship.displayField || "name";

  return (
    <Controller
      name={fieldName}
      control={control}
      render={({ field }) => (
        <Box>
          {/* Selected Items Display */}
          <Box marginBottom={4}>
            <Typography variant="sigma" textColor="neutral800">
              Selected {relationship.title} ({selectedItems.length})
            </Typography>

            {selectedItems.length > 0 && (
              <Box marginTop={2} display="flex" flexWrap="wrap" gap={2}>
                {selectedItems.map((item: any) => {
                  const fullItem = availableItems.find(
                    (a) => a.id === (item.id || item)
                  );
                  return (
                    <Badge key={item.id || item}>
                      {fullItem?.[displayField] || "Unknown"}
                      <IconButton
                        icon={<Cross />}
                        label="Remove"
                        size="S"
                        variant="ghost"
                        onClick={() =>
                          toggleItem(
                            fullItem || { id: item.id || item },
                            field.onChange
                          )
                        }
                        style={{ marginLeft: "4px" }}
                      />
                    </Badge>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Search and Available Items */}
          <Card>
            <CardBody>
              {relationship.searchEnabled && (
                <Box marginBottom={4}>
                  <Searchbar
                    placeholder={`Search ${relationship.title.toLowerCase()}...`}
                    value={searchValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchValue(e.target.value)
                    }
                    onClear={() => setSearchValue("")}
                  />
                </Box>
              )}

              {loading ? (
                <Box display="flex" justifyContent="center" padding={4}>
                  <Loader>Loading {relationship.title.toLowerCase()}...</Loader>
                </Box>
              ) : (
                <Box maxHeight="400px" overflow="auto">
                  <Grid gap={2}>
                    {filteredItems.map((item) => (
                      <GridItem key={item.id} col={12}>
                        <Box
                          padding={3}
                          background={
                            isSelected(item) ? "primary100" : "neutral0"
                          }
                          hasRadius
                          borderStyle="solid"
                          borderColor={
                            isSelected(item) ? "primary600" : "neutral200"
                          }
                          borderWidth="1px"
                          style={{ cursor: "pointer" }}
                          onClick={() => toggleItem(item, field.onChange)}
                        >
                          <Checkbox
                            checked={isSelected(item)}
                            onChange={() => toggleItem(item, field.onChange)}
                          >
                            {item[displayField] || item.id}
                          </Checkbox>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>

                  {filteredItems.length === 0 && (
                    <Box padding={4} textAlign="center">
                      <Typography variant="omega" textColor="neutral600">
                        No {relationship.title.toLowerCase()} found
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardBody>
          </Card>
        </Box>
      )}
    />
  );
};

// Fix for IconButton import (temporary inline component)
const IconButton: React.FC<any> = ({ icon, label, onClick, ...props }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    style={{
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "2px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    {...props}
  >
    {icon}
  </button>
);
