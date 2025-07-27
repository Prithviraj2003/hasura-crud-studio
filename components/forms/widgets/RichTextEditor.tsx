"use client";

import React from "react";
import { Control, Controller } from "react-hook-form";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

interface RichTextEditorProps {
  name: string;
  control: Control<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  validation?: any;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  name,
  control,
  placeholder,
  disabled,
  error,
  validation,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={validation}
      render={({ field }) => (
        <div className="space-y-2">
          <div
            className={`border rounded-md ${
              error ? "border-destructive" : "border-gray-200"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <CKEditor
              editor={ClassicEditor}
              data={field.value || ""}
              onChange={(event, editor) => {
                const data = editor.getData();
                field.onChange(data);
              }}
              onBlur={(event, editor) => {
                field.onBlur();
              }}
              disabled={disabled}
              config={{
                placeholder: placeholder || "Enter your content...",
                toolbar: [
                  "heading",
                  "|",
                  "bold",
                  "italic",
                  "underline",
                  "|",
                  "bulletedList",
                  "numberedList",
                  "|",
                  "outdent",
                  "indent",
                  "|",
                  "link",
                  "blockQuote",
                  "|",
                  "insertTable",
                  "|",
                  "undo",
                  "redo",
                ],
                heading: {
                  options: [
                    { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
                    { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
                    { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
                    { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
                  ],
                },
                table: {
                  contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
                },
              }}
            />
          </div>
        </div>
      )}
    />
  );
};