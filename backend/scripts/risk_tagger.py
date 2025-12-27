import json
import re
from typing import List, Dict, Tuple

# Mock dictionary (This would normally be fetched from Supabase)
RISK_DICTIONARY = {
    'gelatin': {'level': 'medium', 'explanation': 'Source unspecified; likely animal.'},
    'pork gelatin': {'level': 'high', 'explanation': 'Specifically pork-derived.'},
    'carmine': {'level': 'high', 'explanation': 'Derived from insects (E120).'},
    'e120': {'level': 'high', 'explanation': 'Carmine/Insects.'},
    'whey': {'level': 'low', 'explanation': 'Generally halal if enzymes are plant-based.'},
    'alcohol': {'level': 'high', 'explanation': 'May be used in flavorings or as a preservative.'}
}

def tag_ingredients(ingredients_text: str) -> List[Dict]:
    """
    Parses ingredients text and tags risky items.
    Returns a list of dictionaries with ingredient details.
    """
    if not ingredients_text:
        return []

    # Simple normalization: lowercase and split by common delimiters
    # In production, we'd use a more robust regex or AI parser
    normalized = ingredients_text.lower()
    items = re.split(r'[,;.\n]', normalized)
    items = [i.strip() for i in items if i.strip()]

    results = []
    for item in items:
        found = False
        # Exact or partial match in dictionary
        for key, info in RISK_DICTIONARY.items():
            if key in item:
                results.append({
                    'original': item,
                    'matched_on': key,
                    'risk_level': info['level'],
                    'explanation': info['explanation']
                })
                found = True
                break
        
        if not found:
            # We don't record 'low' risk items here for brevity 
            # unless we want to map everything.
            pass

    return results

def get_overall_risk(results: List[Dict]) -> str:
    levels = [r['risk_level'] for r in results]
    if 'high' in levels:
        return 'high'
    if 'medium' in levels:
        return 'medium'
    if 'low' in levels:
        return 'low'
    return 'unknown'

if __name__ == "__main__":
    sample_ingredients = "Sugar, Cocoa Butter, Milk Solids (14%), Cocoa Mass, Gelatin (Pork), Emulsifiers (Soy Lecithin, 476), Flavours, Carmine."
    
    findings = tag_ingredients(sample_ingredients)
    overall = get_overall_risk(findings)
    
    print(f"Sample: {sample_ingredients}")
    print(f"Overall Risk: {overall.upper()}")
    print("Findings:")
    for f in findings:
        print(f" - [{f['risk_level'].upper()}] {f['original']} ({f['explanation']})")
