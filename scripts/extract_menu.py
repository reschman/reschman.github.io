#!/usr/bin/env python3
"""Extract school menu from PDF and save as JSON."""

import os
import json
import sys
from datetime import datetime
from urllib.request import urlretrieve

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed")
    sys.exit(1)


def extract_menu():
    """Download PDF and extract menu data by day."""
    # Setup
    os.makedirs('data/menus', exist_ok=True)
    
    # Calculate week/year
    now = datetime.now()
    week = now.strftime("%V")
    year = now.strftime("%y")
    
    # Download PDF
    url = f"https://www.stadt-zuerich.ch/content/dam/stzh/schulen/pfingstweid/download-dateien/MenuWo{week}_{year}.pdf"
    pdf_file = "data/menus/menu-current.pdf"
    
    print(f"Downloading menu for week {week}, year {year}...")
    try:
        urlretrieve(url, pdf_file)
        print(f"✓ Downloaded to {pdf_file}")
    except Exception as e:
        print(f"ERROR downloading PDF: {e}")
        sys.exit(1)
    
    # Parse PDF table
    days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]
    menu_data = {day: [] for day in days}
    
    try:
        with pdfplumber.open(pdf_file) as pdf:
            page = pdf.pages[0]
            tables = page.extract_tables()
            
            if not tables:
                print("ERROR: No tables found in PDF")
                sys.exit(1)
            
            table = tables[0]
            print(f"✓ Found table with {len(table)} rows and {len(table[0])} columns")
            
            # Find column index for each day
            day_columns = {}
            for col_idx, header_cell in enumerate(table[0]):
                header_text = str(header_cell).strip() if header_cell else ""
                for day in days:
                    if day in header_text:
                        day_columns[day] = col_idx
                        print(f"  Found {day} in column {col_idx}")
                        break
            
            # Extract items for each day
            excluded_items = ["Rohkost", "Blattsalat", "Salatbuffet"]
            
            for day, col_idx in day_columns.items():
                items = []
                for row_idx in range(1, len(table)):
                    cell = table[row_idx][col_idx] if col_idx < len(table[row_idx]) else None
                    if cell:
                        text = str(cell).strip()
                        # Remove newlines and extra spaces
                        text = " ".join(text.split())
                        
                        # Skip empty cells and unwanted items
                        is_excluded = any(excluded in text for excluded in excluded_items)
                        if text and not is_excluded:
                            items.append(text)
                
                # Take max 2 items per day
                menu_data[day] = items[:2]
                print(f"  {day}: {items[:2]}")
    
    except Exception as e:
        print(f"ERROR parsing PDF: {e}")
        sys.exit(1)
    
    # Save JSON
    output = {
        "week": int(week),
        "year": int(year),
        "menu": menu_data,
        "fetched_at": datetime.utcnow().isoformat() + "Z"
    }
    
    try:
        with open('data/menus/menu.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print("✓ Menu saved to data/menus/menu.json")
    except Exception as e:
        print(f"ERROR saving JSON: {e}")
        sys.exit(1)


if __name__ == "__main__":
    extract_menu()
