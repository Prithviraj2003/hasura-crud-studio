"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataTableProps {
  schemaName: string;
  schema: any;
  onEdit: (recordId: string) => void;
  // onDelete: (recordId: string) => void;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  schemaName,
  schema,
  onEdit,
  // onDelete,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters] = useState<Record<string, any>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);

  // Debounce effect for search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [
    schemaName,
    pagination.page,
    pagination.pageSize,
    debouncedSearchTerm,
    filters,
  ]);

  // Restore focus after data load if search was being used
  useEffect(() => {
    if (shouldMaintainFocus && searchInputRef.current) {
      searchInputRef.current.focus();
      setShouldMaintainFocus(false);
    }
  }, [data, shouldMaintainFocus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      });

      const response = await fetch(`/api/data/${schemaName}?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load data");
      }

      const result = await response.json();
      setData(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
      }));
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination((prev) => ({ ...prev, page: 1, pageSize: newPageSize }));
  };

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Mark that we should maintain focus after the search completes
    if (term.length > 0) {
      setShouldMaintainFocus(true);
    }
  }, []);

  // const handleDelete = async (recordId: string) => {
  //   // Check if this schema has relationships that might need cascading
  //   const hasRelationships =
  //     schema?.relationships && schema.relationships.length > 0;

  //   let confirmMessage = "Are you sure you want to delete this record?";
  //   if (hasRelationships) {
  //     confirmMessage +=
  //       "\n\nThis record may have dependent data. Choose:\n- OK for simple delete (may fail if dependencies exist)\n- Cancel to try cascading delete";
  //   }

  //   const simpleDelete = confirm(confirmMessage);

  //   if (!simpleDelete && hasRelationships) {
  //     // User cancelled, offer cascading delete
  //     const cascadeConfirm = confirm(
  //       "Would you like to delete this record and ALL its dependent records?\n\nWARNING: This will permanently delete related data and cannot be undone."
  //     );

  //     if (!cascadeConfirm) return;

  //     return await performCascadingDelete(recordId);
  //   } else if (!simpleDelete) {
  //     return; // User cancelled completely
  //   }

  //   // Perform simple delete
  //   try {
  //     const response = await fetch(`/api/data/${schemaName}/${recordId}`, {
  //       method: "DELETE",
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();

  //       // If foreign key constraint error, offer cascading delete
  //       if (
  //         errorData.suggestion &&
  //         errorData.suggestion.includes("cascade=true")
  //       ) {
  //         const tryAgain = confirm(
  //           `Delete failed: ${errorData.error}\n\nWould you like to try cascading delete instead? This will delete all dependent records first.`
  //         );

  //         if (tryAgain) {
  //           return await performCascadingDelete(recordId);
  //         }
  //       }

  //       throw new Error(errorData.error || "Failed to delete record");
  //     }

  //     // Reload data
  //     loadData();
  //   } catch (err: any) {
  //     console.error("Error deleting record:", err);
  //     setError(err.message);
  //   }
  // };

  // const performCascadingDelete = async (recordId: string) => {
  //   try {
  //     setLoading(true);
  //     const response = await fetch(
  //       `/api/data/${schemaName}/${recordId}?cascade=true`,
  //       {
  //         method: "DELETE",
  //       }
  //     );

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || "Cascading delete failed");
  //     }

  //     const result = await response.json();

  //     // Show success message with details
  //     if (result.cascading && result.deletedRecords) {
  //       const deletedCount = Object.values(result.deletedRecords).reduce(
  //         (total: number, ids: any) =>
  //           total + (Array.isArray(ids) ? ids.length : 0),
  //         0
  //       );
  //       alert(
  //         `Successfully deleted ${deletedCount} records across multiple tables.`
  //       );
  //     }

  //     // Reload data
  //     loadData();
  //   } catch (err: any) {
  //     console.error("Error with cascading delete:", err);
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getDisplayColumns = () => {
    if (!schema?.schema_definition?.fields) return [];

    // Get columns based on UI schema or default to first few fields
    const uiColumns = schema.ui_schema?.list_view?.columns;
    if (uiColumns) {
      return uiColumns;
    }

    // Default to showing first 4 fields plus standard fields
    const fields = schema.schema_definition.fields;
    const defaultColumns = fields
      .filter((field: any) => !field.ui_config?.hidden)
      .slice(0, 4)
      .map((field: any) => field.name);

    // Add common timestamp fields if they exist
    const timestampFields = ["created_at", "updated_at"];
    timestampFields.forEach((field) => {
      if (
        fields.find((f: any) => f.name === field) &&
        !defaultColumns.includes(field)
      ) {
        defaultColumns.push(field);
      }
    });

    return defaultColumns;
  };

  const formatCellValue = (value: any, fieldName: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    // Handle dates
    if (fieldName.includes("_at") || fieldName.includes("date")) {
      try {
        return new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return value;
      }
    }

    // Handle booleans
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    // Handle long text
    if (typeof value === "string" && value.length > 50) {
      return <span title={value}>{value.substring(0, 50)}...</span>;
    }

    // Handle objects (relationships)
    if (typeof value === "object" && value !== null) {
      for (const key in value) {
        if (key.includes("name")) {
          return value[key];
        }
      }
      // Otherwise show the ID or a placeholder
      return value.id || "[Object]";
    }

    return value;
  };

  // const getFieldType = (fieldName: string) => {
  //   const field = schema?.schema_definition?.fields?.find(
  //     (f: any) => f.name === fieldName
  //   );
  //   return field?.type || "text";
  // };

  const displayColumns = getDisplayColumns();
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder={`Search records with ${schema.ui_schema?.list_view?.searchable_columns.join(
                    ", "
                  )}`}
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Records</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {Math.min(
                (pagination.page - 1) * pagination.pageSize + 1,
                pagination.total
              )}{" "}
              to{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}{" "}
              of {pagination.total} results
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No records found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {displayColumns.map((column: any) => (
                      <TableHead key={column} className="font-medium">
                        {column
                          ?.replace(/_/g, " ")
                          ?.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((record, index) => (
                    <TableRow key={record.id || index}>
                      {displayColumns.map((column: any) => (
                        <TableCell key={column}>
                          {formatCellValue(record[column], column)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(record.id)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {/* <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Rows per page:
                  </span>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - pagination.page) <= 2
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={
                              page === pagination.page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
