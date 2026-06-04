# Layout Section Builder: Tool Field Creation Guide

This guide details the step-by-step process of adding and registering new field types (referred to as **tools**) in the Custom Layout Section Builder. Both backend and frontend workspaces must be configured to support, validate, and render the new field type.

---

## Architecture Overview

Layout blocks are defined dynamically using a field schema (a tree of `LayoutFieldDef` nodes). The page content editor (`LayoutConfigForm`) recursively evaluates the schema and mounts appropriate form widgets based on each field's `type`. 

To introduce a new primitive or content field type (like `json`, `svgcode`, or custom elements), update:
1. **Backend Validation Rules**: Enable the type in schema verification.
2. **Frontend Builder Schema**: Register the type, display icon, labels, group, and default keys.
3. **Serialization & Merging Normalizers**: Define default states, empty-state checks, string formatting, and template merge logic.
4. **Layout Builder Defaults UI**: Render the input widget for designers setting default templates.
5. **Page Content Form Widget**: Build the user-facing editor component that loads and saves the actual page data.

---

## Step-by-Step Implementation

### Step 1: Allow Type on the Backend
The backend validates block definitions before saving them to the database. You must whitelist the new type key.

* **File**: `projects-backend/src/lib/cms-service.ts`
* **Modification**: Add your new type string to the `allowedTypes` set in `assertCustomToolDefinition`:

```ts
function assertCustomToolDefinition(value: unknown): Prisma.InputJsonValue {
  const allowedTypes = new Set([
    "title",
    "description",
    "textarea",
    // ... existing types
    "json", // <-- Add your new type here
  ]);
  // ...
}
```

---

### Step 2: Register the Type in Layout Builder Definitions
The frontend layout builder needs to know the type's name, group, visual icon, and what default key it receives when dragged into the layout workspace.

* **File**: `cms/lib/cms/layout-builder.ts`
* **Modifications**:
  1. Add to the `SectionBlockType` union type:
     ```ts
     export type SectionBlockType =
       | "title"
       | "description"
       // ...
       | "json"; // <-- Add here
     ```
  2. Add the tool descriptor to the `SECTION_TOOLS` array (defining its category, e.g. Content, Primitives, or Structure):
     ```ts
     export const SECTION_TOOLS: SectionTool[] = [
       // ...
       {
         id: "json",
         name: "JSON",
         description: "Arbitrary JSON data (object, array, primitive)",
         icon: FiCode, // React icon from react-icons/fi
         group: "primitive", // "content" | "primitive" | "structure"
       },
     ];
     ```
  3. Map the human-readable labels and short labels:
     ```ts
     export const TYPE_LABEL: Record<SectionBlockType, string> = {
       // ...
       json: "JSON",
     };

     export const TYPE_SHORT: Record<SectionBlockType, string> = {
       // ...
       json: "jsn",
     };
     ```
  4. Define the initial field key keys for both layout root insertion and nested insertion:
     ```ts
     const ROOT_DEFAULT_KEY: Partial<Record<SectionBlockType, string>> = {
       // ...
       json: "json",
     };

     const NESTED_DEFAULT_KEY: Record<SectionBlockType, string> = {
       // ...
       json: "json",
     };
     ```

---

### Step 3: Implement Value Serialization & Merging
Specify how defaults are loaded, empty values are initialized, and data is updated or merged on layout refreshes.

* **File**: `cms/lib/cms/layout-payload.ts`
* **Modifications**:
  1. Register inside validation arrays:
     ```ts
     const VALID_SECTION_BLOCK_TYPES = [
       "title",
       "description",
       // ...
       "json",
     ];
     ```
  2. Specify the default initial state in `emptyLeafValue`:
     ```ts
     function emptyLeafValue(type: string): unknown {
       switch (type) {
         // ...
         case "json":
           return {}; // E.g. empty object for JSON, "" for text types
         // ...
       }
     }
     ```
  3. Add input parser/normalization logic in `normalizeLeafDefault` to correctly convert template defaults (strings or structures) to their runtime JS representation:
     ```ts
     function normalizeLeafDefault(type: string, raw: unknown): unknown {
       switch (type) {
         // ...
         case "json":
           if (typeof raw === "string") {
             try {
               return JSON.parse(raw);
             } catch {
               return raw;
             }
           }
           return raw;
         // ...
       }
     }
     ```
  4. Implement `leafDefaultToBuilderString` conversions to format the initial defaults nicely inside the builder code field:
     ```ts
     export function leafDefaultToBuilderString(type: string, raw: unknown): string {
       // ...
       if (type === "json") {
         return JSON.stringify(raw, null, 2);
       }
       // ...
     }
     ```
  5. **Critical (Merging logic)**: If the new type is a complex object (like `json`) but should act as a single leaf-level value, update the `mergeWithDefs` function. Otherwise, the recursive merger (`mergeUnknown`) will try to merge the object's keys with the template keys, wiping out any custom user properties that aren't defined in the template defaults:
     ```ts
     function mergeWithDefs(
       curr: unknown,
       template: unknown,
       defs: LayoutFieldDef[]
     ): unknown {
       // ...
       // If the def matches our type, do not recursively merge:
       if (def.type === "json") {
         // Use the current page editor value if present; fallback to template
         return curr !== undefined ? curr : leafValueFromDef(def);
       }
       // ...
     }
     ```

---

### Step 4: Add Default Input Field in Layout Builder
Layout designers need to edit the optional default value of fields while designing templates.

* **File**: `cms/components/cms/layout-builder/leaf-default-field.tsx`
* **Modification**: Mount the default field widget inside `LayoutBuilderLeafDefaultField`. Ensure to add appropriate format checks and helper messages (e.g. JSON syntax linting):

```tsx
export function LayoutBuilderLeafDefaultField({ block, onChange, onLinkChange }) {
  // ...
  if (block.type === "json") {
    const jsonVal = typeof v === "string" ? v : "";
    let localError: string | null = null;
    if (jsonVal.trim()) {
      try {
        JSON.parse(jsonVal);
      } catch (err) {
        localError = err instanceof Error ? err.message : "Invalid JSON";
      }
    }

    return (
      <div className="max-w-full space-y-1.5">
        <p className="text-xs text-muted-foreground">Default JSON (optional)</p>
        <Textarea
          id={`cms-layout-json-def-${id}`}
          className="w-full min-h-[100px] font-mono text-xs resize-y"
          value={jsonVal}
          onChange={(e) => onChange(id, e.target.value === "" ? undefined : e.target.value)}
          placeholder='{ "key": "value" }'
          spellCheck={false}
        />
        {localError && <p className="text-[10px] text-destructive">Invalid: {localError}</p>}
      </div>
    );
  }
  // ...
}
```

---

### Step 5: Add Field Input Widget on the Page Editor
Render the editor widget where page content creators fill in data for actual page sections.

* **File**: `cms/components/cms/layout-config-form.tsx`
* **Modifications**:
  1. For inputs containing values that change structural identity (like code strings or nested JSON), build a dedicated component that uses a local text state buffer. Sync local changes to the parent form (`onChange`) only on successful formats to avoid cursor jumps or infinite render loops:
     ```tsx
     function JsonFieldEditor({ fid, def, value, onChange }) {
       const [prevVal, setPrevVal] = useState(value);
       const [text, setText] = useState(() => (value == null ? "" : JSON.stringify(value, null, 2)));
       const [error, setError] = useState<string | null>(null);

       if (value !== prevVal) {
         setPrevVal(value);
         setText(value == null ? "" : JSON.stringify(value, null, 2));
         setError(null);
       }

       const handleChange = (newVal: string) => {
         setText(newVal);
         if (!newVal.trim()) {
           setError(null);
           onChange(null);
           return;
         }
         try {
           const parsed = JSON.parse(newVal);
           setError(null);
           onChange(parsed);
         } catch (err) {
           setError(err instanceof Error ? err.message : "Invalid JSON");
         }
       };

       return (
         <div className="space-y-2">
           <FieldLabelLine htmlFor={fid} def={def} />
           <Textarea id={fid} value={text} onChange={(e) => handleChange(e.target.value)} />
           {error && <p className="text-xs text-destructive">{error}</p>}
         </div>
       );
     }
     ```
  2. Mount the editor under `LayoutConfigField` render switcher:
     ```tsx
     function LayoutConfigField({ def, value, onChange }) {
       // ...
       switch (def.type) {
         // ...
         case "json":
           return (
             <JsonFieldEditor
               fid={fid}
               def={def}
               value={value}
               onChange={onChange}
             />
           );
         // ...
       }
     }
     ```

---

## Verification checklist

1. **Compilation**: Run type checks in the client workspace:
   ```bash
   pnpm exec tsc --noEmit
   ```
2. **Linting**: Ensure there are no cascading render warnings or dependency array errors:
   ```bash
   pnpm lint
   ```
3. **Database & API**: Save a layout definition using the new type. Reload the page builder and verify that the database payload correctly captures the new field template.
4. **Editor Experience**: Create a page utilizing the updated layout. Enter inputs, verify there are no validation warnings or layout merge loops, save the block config, and check the API response payload.
