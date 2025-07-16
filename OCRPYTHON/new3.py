import json
import os

def handler(input_data):
    """
    Process the input JSON data and extract all details, including line items.
    
    Args:
        input_data: JSON string or Python dict containing table data
        
    Returns:
        dict: Processed data with headers and line items
    """
    print("hello")  # Your initial requirement
    
    # If input_data is a JSON string, parse it; otherwise, assume it's a dict
    if isinstance(input_data, str):
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {str(e)}"}
    else:
        data = input_data

    # Check if data is an array (as per your JSON structure)
    if not isinstance(data, list):
        return {"error": "Input data must be a list of table objects"}

    result = {
        "headers": {},
        "line_items": [],
        "additional_tables": []
    }

    # Process each table in the JSON
    for table in data:
        if table.get("label") != "table" or "cells" not in table:
            continue  # Skip non-table objects

        cells = table["cells"]
        rows = {}

        # Group cells by row
        for cell in cells:
            row_num = cell["row"]
            if row_num not in rows:
                rows[row_num] = {}
            # Use column number as key and text as value
            rows[row_num][cell["col"]] = cell["text"]

        # Identify if this is the line item table (has multiple rows with data)
        if len(rows) > 2 and any(row > 1 and rows[row].get(2) for row in rows):  # Check for DESCRIPTION in col 2
            # Extract headers from row 1
            if 1 in rows:
                result["headers"] = rows[1]

            # Extract line items from rows 2+
            for row_num in sorted(rows.keys()):
                if row_num > 1 and rows[row_num].get(2):  # Ensure DESCRIPTION exists
                    line_item = {
                        "SKU": rows[row_num].get(1, ""),
                        "Description": rows[row_num].get(2, ""),
                        "Quantity": rows[row_num].get(3, ""),
                        "Unit_Price": rows[row_num].get(4, ""),
                        "Total": rows[row_num].get(5, "")
                    }
                    result["line_items"].append(line_item)
        else:
            # Store other tables (e.g., shipping, totals)
            result["additional_tables"].append({
                "table_data": rows
            })

    return result

# Function to read JSON from a file with flexible encoding
def read_json_file(file_path):
    try:
        # First, attempt to read with UTF-8 (common for JSON)
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except UnicodeDecodeError:
        # If UTF-8 fails, try reading as binary and decode with fallback
        with open(file_path, "rb") as f:
            raw_data = f.read()
            try:
                return json.loads(raw_data.decode("utf-8-sig"))  # Handle BOM if present
            except UnicodeDecodeError:
                try:
                    return json.loads(raw_data.decode("latin-1"))  # Fallback encoding
                except UnicodeDecodeError:
                    raise Exception("Unable to decode file with UTF-8, UTF-8-SIG, or Latin-1 encoding.")
    except json.JSONDecodeError as e:
        raise Exception(f"Invalid JSON in file {file_path}: {str(e)}")
    except FileNotFoundError:
        raise Exception(f"File {file_path} not found.")

# Example usage with your JSON file
if __name__ == "__main__":
    # Path to your JSON file (named as .pdf)
    json_file_path = "/Users/LST/Downloads/REI PO 1192223 (1).pdf"

    try:
        # Read the JSON data from the file
        json_data = read_json_file(json_file_path)

        # Call the handler
        output = handler(json_data)
        
        # Print the result
        print(json.dumps(output, indent=2))

        # Optional: Rename the file to .json for clarity
        new_file_path = json_file_path.replace(".pdf", ".json")
        if not os.path.exists(new_file_path):
            os.rename(json_file_path, new_file_path)
            print(f"Renamed file to {new_file_path}")
        else:
            print(f"File {new_file_path} already exists; skipping rename.")

    except Exception as e:
        print(f"Error: {str(e)}")